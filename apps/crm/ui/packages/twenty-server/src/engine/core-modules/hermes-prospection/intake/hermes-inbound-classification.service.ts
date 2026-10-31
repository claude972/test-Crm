import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { v5 } from 'uuid';
import { z } from 'zod';

import { buildSystemAuthContext } from 'src/engine/core-modules/auth/utils/build-system-auth-context.util';
import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { type HermesProspectionActor } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { centralIntakeRecord } from 'src/engine/core-modules/hermes-prospection/intake/hermes-central-intake';
import {
  type HermesInboundItemClassification,
  type HermesInboundLinks,
  type HermesScrapingClassification,
} from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.dto';
import {
  parseHermesIntakeConnections,
  type HermesIntakeConnection,
} from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.schema';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { fromWorkspaceEntityToFlat } from 'src/engine/core-modules/workspace/utils/from-workspace-entity-to-flat.util';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildEmailingRolePermissionConfig } from 'src/modules/emailing/utils/build-emailing-role-permission-config.util';
import { NoteWorkspaceEntity } from 'src/modules/note/standard-objects/note.workspace-entity';
import { NoteTargetWorkspaceEntity } from 'src/modules/note/standard-objects/note-target.workspace-entity';
import { CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import { OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

const RECEIPT_MARKER = 'Hermes receipt SHA256 ';
const bridgeInputSchema = z
  .object({
    provider: z.enum(['HEYFORM', 'CAL_DIY']),
    eventId: z.string().trim().min(1).max(200),
    bookingUid: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  // A booking identifier only means something for the calendar provider.
  .refine((value) => !value.bookingUid || value.provider === 'CAL_DIY');

@Injectable()
export class HermesInboundClassificationService {
  constructor(
    private readonly access: HermesProspectionAccessService,
    private readonly config: KovaaLabCRMConfigService,
    private readonly prospection: HermesProspectionService,
    private readonly roles: UserRoleService,
    private readonly orm: WorkspaceOrmManager,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaces: Repository<WorkspaceEntity>,
    @Optional() private readonly central?: HermesConnectionsService,
  ) {}

  // The company's own signed connections. The browser never names one: the
  // candidate list comes from the server-side binding of this workspace.
  private async connectionsOf(
    workspaceId: string,
  ): Promise<Record<string, HermesIntakeConnection>> {
    const central = this.central;
    let connections: Record<string, HermesIntakeConnection>;
    if (central) {
      const resolved = await central.resolve(workspaceId, 'INTAKE');
      connections = resolved ? centralIntakeRecord(resolved) : {};
    } else
      connections = parseHermesIntakeConnections(
        this.config.get('HERMES_INTAKE_CONNECTIONS'),
      );
    return Object.fromEntries(
      Object.entries(connections).filter(
        ([, connection]) => connection.workspaceId === workspaceId,
      ),
    );
  }

  // Classifies one Forms submission or one booking receipt. Every identifier
  // is recomputed from (company, connection, provider, event), so the stored
  // record is reached by its own deterministic key and the attribution is
  // proven rather than read from a mutable field.
  async classifyBridgeEvent(
    actor: HermesProspectionActor,
    raw: { provider: string; eventId: string; bookingUid?: string },
  ): Promise<HermesInboundItemClassification> {
    await this.access.assertAllowed(actor);
    const parsed = bridgeInputSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException('HERMES_CLASSIFICATION_INPUT_INVALID');
    const input = parsed.data;
    const checkedAt = new Date().toISOString();
    const required = input.provider === 'HEYFORM' ? 'FORMS' : 'CALENDAR';
    const candidates = Object.entries(await this.connectionsOf(actor.workspaceId))
      .filter(([, connection]) => connection.allowedSources.includes(required))
      .map(([connectionId]) => connectionId);
    const unclassified = {
      checkedAt,
      origin: null,
      links: null,
      contactState: 'UNLINKED' as const,
      automaticDealCreated: false,
    };
    if (!candidates.length)
      return { status: 'NOT_CONFIGURED', ...unclassified };
    const workspace = await this.workspaces.findOneBy({
      id: actor.workspaceId,
    });
    if (!workspace) return { status: 'NOT_CONFIGURED', ...unclassified };
    const roleId = await this.roles.getRoleIdForUserWorkspace(actor);
    const source = input.provider === 'HEYFORM' ? 'FORMS' : 'CALENDAR';
    const result = await this.orm.executeInWorkspaceContext(
      async (): Promise<HermesInboundItemClassification> => {
        const permissions = buildEmailingRolePermissionConfig(roleId);
        const notes = this.orm.getRepository<NoteWorkspaceEntity>(
          'note',
          permissions,
        );
        const targets = this.orm.getRepository<NoteTargetWorkspaceEntity>(
          'noteTarget',
          permissions,
        );
        for (const connectionId of candidates) {
          const eventKey = JSON.stringify([
            actor.workspaceId,
            connectionId,
            input.provider,
            input.eventId,
          ]);
          const noteId = v5(`note:${eventKey}`, v5.URL);
          const note = await notes.findOne({ where: { id: noteId } });
          if (!note) continue;
          const markdown = note.bodyV2?.markdown ?? '';
          const target = await targets.findOne({
            where: { id: v5(`target:${eventKey}`, v5.URL) },
          });
          const personId = target?.targetPersonId ?? null;
          const links: HermesInboundLinks = {
            personId,
            companyId: target?.targetCompanyId ?? null,
            noteId,
            calendarEventId: await this.bookingId(
              actor.workspaceId,
              connectionId,
              input,
              permissions,
            ),
            conversationId: null,
            existingOpportunityIds: await this.existingOpportunities(
              personId,
              permissions,
            ),
          };
          return {
            status: 'CLASSIFIED',
            checkedAt,
            origin: {
              source,
              provider: input.provider,
              connectionId,
              structureId: actor.workspaceId,
              eventId: input.eventId,
              receivedAt: this.reportedAt(markdown) ?? null,
              // The record exists under the identifier this connection and
              // event produce. A body that lost its receipt marker is still
              // attributed, but reported as edited rather than intact.
              attribution: markdown.startsWith(RECEIPT_MARKER)
                ? 'VERIFIED'
                : 'EDITED_RECEIPT',
            },
            links,
            contactState: personId ? 'LINKED' : 'UNLINKED',
            automaticDealCreated: false,
          };
        }
        return { status: 'NOT_FOUND', ...unclassified };
      },
      buildSystemAuthContext({
        workspace: fromWorkspaceEntityToFlat(workspace),
      }),
    );
    // A role revoked while the records were read must not deliver them.
    await this.access.assertAllowed(actor);
    return result;
  }

  private async bookingId(
    workspaceId: string,
    connectionId: string,
    input: z.infer<typeof bridgeInputSchema>,
    permissions: ReturnType<typeof buildEmailingRolePermissionConfig>,
  ): Promise<string | null> {
    // The receipt note does not carry the booking identifier, so a calendar
    // record is only reported when the caller supplies the booking UID it
    // already holds. Nothing is guessed.
    if (input.provider !== 'CAL_DIY' || !input.bookingUid) return null;
    const calendarEventId = v5(
      `calendar:${JSON.stringify([workspaceId, connectionId, input.bookingUid])}`,
      v5.URL,
    );
    const calendars = this.orm.getRepository<CalendarEventWorkspaceEntity>(
      'calendarEvent',
      permissions,
    );
    const calendar = await calendars.findOne({
      where: { id: calendarEventId },
    });
    return calendar ? calendarEventId : null;
  }

  // Reads the opportunities that already point at this contact. This is the
  // pipeline link; no opportunity is created, here or on any inbound path.
  private async existingOpportunities(
    personId: string | null,
    permissions: ReturnType<typeof buildEmailingRolePermissionConfig>,
  ): Promise<string[]> {
    if (!personId) return [];
    const opportunities = this.orm.getRepository<OpportunityWorkspaceEntity>(
      'opportunity',
      permissions,
    );
    const existing = await opportunities.find({
      where: { pointOfContactId: personId },
      select: { id: true },
    });
    return existing.map((opportunity) => opportunity.id).slice(0, 100);
  }

  private reportedAt(markdown: string): string | undefined {
    const line = markdown
      .split('\n')
      .find((value) => value.startsWith('Reported at: '));
    const value = line?.slice('Reported at: '.length).trim();
    return value && Number.isFinite(Date.parse(value)) ? value : undefined;
  }

  // Classifies the signed scraping deposits of the company: their provenance,
  // their row outcomes including duplicates, and the contacts a human
  // qualification has already linked. A deposit is never a deal.
  async classifyScrapingBatches(
    actor: HermesProspectionActor,
  ): Promise<HermesScrapingClassification> {
    await this.access.assertAllowed(actor);
    const checkedAt = new Date().toISOString();
    const state = await this.prospection.list(actor);
    return {
      checkedAt,
      structureId: actor.workspaceId,
      automaticDealCreated: false,
      batches: state.batches.map((batch) => {
        const rows = batch.rows ?? [];
        const count = (status: string) =>
          rows.filter((row) => row.status === status).length;
        return {
          batchId: batch.id,
          externalBatchId: batch.externalBatchId,
          origin: {
            source: 'SCRAPING' as const,
            provider: null,
            connectionId:
              batch.origin?.kind === 'SIGNED_INTAKE'
                ? batch.origin.connectionId
                : null,
            structureId: actor.workspaceId,
            eventId: batch.externalBatchId,
            receivedAt:
              batch.origin?.kind === 'SIGNED_INTAKE'
                ? batch.origin.receivedAt
                : null,
            // A historical batch carries no origin receipt, and a manual one
            // was not produced by a signed connection: neither is presented as
            // an attributed automatic reception.
            attribution:
              batch.origin?.kind === 'SIGNED_INTAKE'
                ? ('VERIFIED' as const)
                : ('NOT_ATTRIBUTABLE' as const),
          },
          counts: {
            total: rows.length,
            pending: count('pending'),
            invalid: count('invalid'),
            duplicate: count('duplicate'),
            suppressed: count('suppressed'),
            conflict: count('conflict'),
            qualified: count('qualified'),
          },
          qualificationRequired: true,
          linkedPersonIds: [
            ...new Set(
              rows
                .map((row) => row.personId)
                .filter((value): value is string => !!value),
            ),
          ],
          linkedCompanyIds: [
            ...new Set(
              rows
                .map((row) => row.companyId)
                .filter((value): value is string => !!value),
            ),
          ],
        };
      }),
    };
  }
}
