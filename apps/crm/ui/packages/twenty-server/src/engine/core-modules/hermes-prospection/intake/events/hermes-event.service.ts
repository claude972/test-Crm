import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { createHash } from 'node:crypto';
import { FieldActorSource } from 'kovaa-lab-shared/types';
import { Repository } from 'typeorm';
import { v5 } from 'uuid';

import { buildSystemAuthContext } from 'src/engine/core-modules/auth/utils/build-system-auth-context.util';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { type HermesProspectionActor } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';
import { parseHermesIntakeConnections } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.schema';
import { verifyHermesIntakeSignature } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-signature';
import { type HermesIntakeHeaders } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.service';
import {
  hermesFormEventSchema,
  hermesCalendarEventSchema,
  type HermesBridgeEvent,
} from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.schema';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { fromWorkspaceEntityToFlat } from 'src/engine/core-modules/workspace/utils/from-workspace-entity-to-flat.util';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { NoteWorkspaceEntity } from 'src/modules/note/standard-objects/note.workspace-entity';
import { NoteTargetWorkspaceEntity } from 'src/modules/note/standard-objects/note-target.workspace-entity';
import { CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import { CalendarEventTargetWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-target.workspace-entity';
import { MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';
import { buildEmailingRolePermissionConfig } from 'src/modules/emailing/utils/build-emailing-role-permission-config.util';

const safeText = (value: string) =>
  value.replace(/[\\`*_{}\[\]()#+.!<>|~]/g, '\\$&');

@Injectable()
export class HermesEventService {
  constructor(
    private readonly config: KovaaLabCRMConfigService,
    private readonly replay: HermesIntakeReplayService,
    private readonly access: HermesProspectionAccessService,
    private readonly roles: UserRoleService,
    private readonly orm: WorkspaceOrmManager,
    private readonly suppressions: MessageSuppressionService,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaces: Repository<WorkspaceEntity>,
  ) {}

  async receive(
    kind: 'forms' | 'calendar',
    connectionId: string,
    body: Buffer | undefined,
    headers: HermesIntakeHeaders,
  ) {
    if (!body || body.length > 64_000)
      throw new BadRequestException('HERMES_EVENT_PAYLOAD_INVALID');
    let connections;
    try {
      connections = parseHermesIntakeConnections(
        this.config.get('HERMES_INTAKE_CONNECTIONS'),
      );
    } catch {
      throw new ServiceUnavailableException(
        'HERMES_EVENT_CONFIGURATION_UNAVAILABLE',
      );
    }
    const connection = Object.prototype.hasOwnProperty.call(
      connections,
      connectionId,
    )
      ? connections[connectionId]
      : undefined;
    if (
      !connection?.enabled ||
      !connection.allowedSources.includes(
        kind === 'forms' ? 'FORMS' : 'CALENDAR',
      ) ||
      !verifyHermesIntakeSignature({
        connectionId,
        body,
        ...headers,
        secret: connection.secret,
        now: Date.now(),
      })
    )
      throw new UnauthorizedException('HERMES_EVENT_AUTHENTICATION_FAILED');
    let event: HermesBridgeEvent;
    try {
      const text = body.toString('utf8');
      if (!Buffer.from(text, 'utf8').equals(body)) throw new Error();
      event = (
        kind === 'forms' ? hermesFormEventSchema : hermesCalendarEventSchema
      ).parse(JSON.parse(text));
    } catch {
      throw new BadRequestException('HERMES_EVENT_PAYLOAD_INVALID');
    }
    const claim = await this.replay.claim(
      connectionId,
      headers.nonce,
      connection.maxRequestsPerMinute,
    );
    if (claim !== 'claimed')
      throw new ConflictException('HERMES_EVENT_REQUEST_NOT_ACCEPTED');
    const actor = {
      workspaceId: connection.workspaceId,
      userId: connection.operatorUserId,
      userWorkspaceId: connection.operatorUserWorkspaceId,
    };
    await this.access.assertAllowed(actor);
    return this.record(actor, connectionId, event);
  }

  private async record(
    actor: HermesProspectionActor,
    connectionId: string,
    event: HermesBridgeEvent,
  ) {
    const workspace = await this.workspaces.findOneBy({
      id: actor.workspaceId,
    });
    if (!workspace) throw new ForbiddenException('HERMES_EVENT_ACCESS_DENIED');
    const roleId = await this.roles.getRoleIdForUserWorkspace(actor);
    return this.orm.executeInWorkspaceContext(
      async () => {
        const permissions = buildEmailingRolePermissionConfig(roleId);
        return this.orm.runInWorkspaceTransaction(async (transaction) => {
          // Serialize this workspace's ingress upserts, including distinct events
          // arriving simultaneously for the same email. Never interpolate a schema.
          await transaction.executeRawQuery(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [`hermes-events:${actor.workspaceId}`],
          );
          await this.access.assertAllowed(actor);
          const blocked = await this.suppressions.findApplicableSuppressions({
            workspaceId: actor.workspaceId,
            emailAddresses: [event.contact.email],
          });
          const isSuppressed = blocked.some(
            (entry) => entry.reason !== 'TRACKING',
          );
          const people = transaction.getRepository<PersonWorkspaceEntity>(
            'person',
            permissions,
          );
          const companies = transaction.getRepository<CompanyWorkspaceEntity>(
            'company',
            permissions,
          );
          const notes = transaction.getRepository<NoteWorkspaceEntity>(
            'note',
            permissions,
          );
          const targets = transaction.getRepository<NoteTargetWorkspaceEntity>(
            'noteTarget',
            permissions,
          );
          const eventKey = JSON.stringify([
            actor.workspaceId,
            connectionId,
            event.provider,
            event.eventId,
          ]);
          const noteId = v5(`note:${eventKey}`, v5.URL);
          const digest = createHash('sha256')
            .update(JSON.stringify(event))
            .digest('hex');
          const marker = `Hermes receipt SHA256 ${digest}`;
          const matching = await people
            .createQueryBuilder('person')
            .withDeleted()
            .where(
              'LOWER("person"."emailsPrimaryEmail") = :email OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE("person"."emailsAdditionalEmails", \'[]\'::jsonb)) AS email(value) WHERE LOWER(email.value) = :email)',
              { email: event.contact.email },
            )
            .take(2)
            .getMany<PersonWorkspaceEntity>();
          if (
            matching.length > 1 ||
            matching[0]?.deletedAt ||
            (isSuppressed && matching.length === 0)
          )
            throw new ConflictException('HERMES_EVENT_CONTACT_REQUIRES_REVIEW');
          const person = matching[0];
          const bookingKey =
            event.provider === 'CAL_DIY'
              ? JSON.stringify([
                  actor.workspaceId,
                  connectionId,
                  event.event.bookingUid,
                ])
              : null;
          const calendarEventId = bookingKey
            ? v5(`calendar:${bookingKey}`, v5.URL)
            : null;
          const calendarTargetId = bookingKey
            ? v5(`calendar-target:${bookingKey}`, v5.URL)
            : null;
          const calendars =
            event.provider === 'CAL_DIY'
              ? transaction.getRepository<CalendarEventWorkspaceEntity>(
                  'calendarEvent',
                  permissions,
                )
              : null;
          const calendarTargets =
            event.provider === 'CAL_DIY'
              ? transaction.getRepository<CalendarEventTargetWorkspaceEntity>(
                  'calendarEventTarget',
                  permissions,
                )
              : null;
          const calendar =
            calendars && calendarEventId
              ? await calendars.findOne({
                  where: { id: calendarEventId },
                  withDeleted: true,
                })
              : null;
          const calendarTarget =
            calendarTargets && calendarTargetId
              ? await calendarTargets.findOne({
                  where: { id: calendarTargetId },
                  withDeleted: true,
                })
              : null;
          if (
            event.provider === 'CAL_DIY' &&
            (calendar?.deletedAt ||
              (calendar &&
                (!calendarTarget ||
                  calendarTarget.deletedAt ||
                  calendarTarget.calendarEventId !== calendarEventId ||
                  calendarTarget.targetPersonId !== person?.id)))
          )
            throw new ConflictException('HERMES_EVENT_BOOKING_REQUIRES_REVIEW');
          if (
            event.provider === 'CAL_DIY' &&
            calendar &&
            calendar.externalUpdatedAt &&
            Date.parse(calendar.externalUpdatedAt) ===
              Date.parse(event.occurredAt) &&
            (calendar.isCanceled !== (event.event.status === 'CANCELLED') ||
              calendar.title !== event.event.title ||
              Date.parse(calendar.startsAt ?? '') !==
                Date.parse(event.event.startsAt) ||
              Date.parse(calendar.endsAt ?? '') !==
                Date.parse(event.event.endsAt))
          )
            throw new ConflictException('HERMES_EVENT_BOOKING_REQUIRES_REVIEW');
          const previousCalendarId =
            event.provider === 'CAL_DIY' &&
            event.event.type === 'BOOKING_RESCHEDULED' &&
            event.event.previousBookingUid &&
            event.event.previousBookingUid !== event.event.bookingUid
              ? v5(
                  `calendar:${JSON.stringify([actor.workspaceId, connectionId, event.event.previousBookingUid])}`,
                  v5.URL,
                )
              : null;
          const previousCalendar =
            previousCalendarId && calendars
              ? await calendars.findOne({
                  where: { id: previousCalendarId },
                  withDeleted: true,
                })
              : null;
          if (
            previousCalendarId &&
            (!previousCalendar || previousCalendar.deletedAt)
          )
            throw new ConflictException('HERMES_EVENT_BOOKING_REQUIRES_REVIEW');
          if (
            previousCalendarId &&
            calendarTargets &&
            event.provider === 'CAL_DIY'
          ) {
            const previousTargetId = v5(
              `calendar-target:${JSON.stringify([actor.workspaceId, connectionId, event.event.previousBookingUid])}`,
              v5.URL,
            );
            const previousTarget = await calendarTargets.findOne({
              where: { id: previousTargetId },
              withDeleted: true,
            });
            if (
              !previousTarget ||
              previousTarget.deletedAt ||
              previousTarget.calendarEventId !== previousCalendarId ||
              previousTarget.targetPersonId !== person?.id
            )
              throw new ConflictException(
                'HERMES_EVENT_BOOKING_REQUIRES_REVIEW',
              );
          }
          const prior = await notes.findOne({
            where: { id: noteId },
            withDeleted: true,
          });
          if (prior) {
            const target = await targets.findOne({
              where: { id: v5(`target:${eventKey}`, v5.URL) },
              withDeleted: true,
            });
            if (
              prior.deletedAt ||
              !prior.bodyV2?.markdown?.startsWith(`${marker}\n`) ||
              !person ||
              !target ||
              target.deletedAt ||
              target.noteId !== noteId ||
              target.targetPersonId !== person.id ||
              (event.provider === 'CAL_DIY' && !calendar)
            )
              throw new ConflictException(
                'HERMES_EVENT_REPLAY_REQUIRES_REVIEW',
              );
            return {
              personId: person.id,
              noteId,
              calendarEventId,
              replay: true,
              marketingConsentGranted: false,
            };
          }
          if (event.provider === 'CAL_DIY') {
            if (
              (!calendar &&
                event.event.type !== 'BOOKING_CREATED' &&
                !previousCalendar) ||
              (calendar && event.event.type === 'BOOKING_CREATED') ||
              (calendar &&
                Date.parse(calendar.externalUpdatedAt ?? '') >=
                  Date.parse(event.occurredAt))
            )
              throw new ConflictException(
                'HERMES_EVENT_BOOKING_REQUIRES_REVIEW',
              );
          }
          if (
            previousCalendar &&
            event.provider === 'CAL_DIY' &&
            (previousCalendar.isCanceled ||
              Date.parse(previousCalendar.externalUpdatedAt ?? '') >=
                Date.parse(event.occurredAt))
          )
            throw new ConflictException('HERMES_EVENT_BOOKING_REQUIRES_REVIEW');
          let companyId = person?.companyId ?? null;
          if (event.contact.companyName) {
            const matches = await companies
              .createQueryBuilder('company')
              .withDeleted()
              .where('LOWER(TRIM("company"."name")) = :name', {
                name: event.contact.companyName.toLowerCase(),
              })
              .take(2)
              .getMany<CompanyWorkspaceEntity>();
            if (
              matches.length > 1 ||
              matches[0]?.deletedAt ||
              (person && (!matches[0] || person.companyId !== matches[0].id))
            )
              throw new ConflictException(
                'HERMES_EVENT_CONTACT_REQUIRES_REVIEW',
              );
            companyId =
              matches[0]?.id ??
              v5(
                `company:${actor.workspaceId}:${event.contact.companyName.toLowerCase()}`,
                v5.URL,
              );
            if (!matches[0])
              await companies.insert({
                id: companyId,
                name: event.contact.companyName,
                position: 0,
              });
          }
          const personId =
            person?.id ??
            v5(`person:${actor.workspaceId}:${event.contact.email}`, v5.URL);
          if (!person) {
            await people.insert({
              id: personId,
              companyId,
              position: 0,
              name: {
                firstName: event.contact.firstName,
                lastName: event.contact.lastName,
              },
              emails: {
                primaryEmail: event.contact.email,
                additionalEmails: [],
              },
            });
          }
          const summary =
            event.provider === 'HEYFORM'
              ? event.event.summary
              : `${event.event.title}\n${event.event.startsAt} — ${event.event.endsAt}\n${event.event.location}`;
          const markdown = `${marker}\n\nSource: ${event.provider}\nEvent: ${safeText(event.eventId)}\nReported at: ${event.occurredAt}\n\n${safeText(summary)}\n\nReceived through an authenticated bridge. No marketing consent or attendance is inferred.`;
          const actorMetadata = {
            source: FieldActorSource.WEBHOOK,
            name: `Hermes ${event.provider} bridge`,
            workspaceMemberId: null,
            context: {},
          };
          await notes.insert({
            id: noteId,
            position: 0,
            title:
              event.provider === 'HEYFORM'
                ? `Form: ${event.event.formName}`
                : `Booking: ${event.event.title}`,
            bodyV2: { markdown, blocknote: null },
            createdBy: actorMetadata,
            updatedBy: actorMetadata,
          });
          await targets.insert({
            id: v5(`target:${eventKey}`, v5.URL),
            noteId,
            targetPersonId: personId,
            targetCompanyId: companyId,
          });
          if (
            event.provider === 'CAL_DIY' &&
            calendars &&
            calendarTargets &&
            calendarEventId &&
            calendarTargetId
          ) {
            const values = {
              title: event.event.title,
              isCanceled: event.event.status === 'CANCELLED',
              isFullDay: false,
              startsAt: event.event.startsAt,
              endsAt: event.event.endsAt,
              externalUpdatedAt: event.occurredAt,
              description: `${event.event.type} reported by the configured Cal.diy bridge; no attendance inferred.`,
              location: event.event.location,
            };
            if (previousCalendarId)
              await calendars.update(previousCalendarId, {
                isCanceled: true,
                externalUpdatedAt: event.occurredAt,
              });
            if (calendar) await calendars.update(calendarEventId, values);
            else {
              await calendars.insert({
                ...values,
                id: calendarEventId,
                externalCreatedAt: event.occurredAt,
                iCalUid: null,
                conferenceSolution: null,
                conferenceLink: {
                  primaryLinkLabel: '',
                  primaryLinkUrl: '',
                  secondaryLinks: [],
                },
              });
              await calendarTargets.insert({
                id: calendarTargetId,
                calendarEventId,
                targetPersonId: personId,
                targetCompanyId: companyId,
                isAutomaticallyAssigned: true,
                isManuallyAssigned: false,
              });
            }
          }
          return {
            personId: personId,
            noteId,
            calendarEventId,
            replay: false,
            marketingConsentGranted: false,
          };
        });
      },
      buildSystemAuthContext({
        workspace: fromWorkspaceEntityToFlat(workspace),
      }),
    );
  }
}
