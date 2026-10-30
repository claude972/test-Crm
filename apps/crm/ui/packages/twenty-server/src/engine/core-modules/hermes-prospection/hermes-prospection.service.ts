import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import { MessageCampaignStatus } from 'kovaa-lab-shared/types';
import { v5 } from 'uuid';
import { In } from 'typeorm';

import {
  HermesCreateCampaignDraftInput,
  HermesCreateImportBatchInput,
  HermesQualifyImportRowsInput,
} from 'src/engine/core-modules/hermes-prospection/dto/hermes-prospection.input';
import { HermesImportStateService } from 'src/engine/core-modules/hermes-prospection/hermes-import-state.service';
import {
  type HermesImportRow,
  type HermesProspectionActor,
} from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import {
  buildHermesImportBatch,
  claimHermesImportBatch,
  HERMES_IMPORT_LIMITS,
} from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { CompanyWorkspaceEntity } from 'src/modules/company/standard-objects/company.workspace-entity';
import { MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';
import { MessageCampaignWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-campaign.workspace-entity';
import { MessageListWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-list.workspace-entity';
import { MessageListMemberWorkspaceEntity } from 'src/modules/emailing/standard-objects/message-list-member.workspace-entity';
import { buildEmailingRolePermissionConfig } from 'src/modules/emailing/utils/build-emailing-role-permission-config.util';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class HermesProspectionService {
  constructor(
    private readonly states: HermesImportStateService,
    private readonly suppressions: MessageSuppressionService,
    private readonly orm: WorkspaceOrmManager,
    private readonly roles: UserRoleService,
  ) {}

  async list(actor: HermesProspectionActor) {
    const state = await this.states.read(actor);

    await this.applySuppressions(
      actor.workspaceId,
      state.batches.flatMap((batch) => batch.rows),
    );

    return {
      ...state,
      capabilities: {
        smtpCampaignSending: false,
        trackingDefault: false,
        nativeCampaignDrafts: true,
      },
    };
  }

  async createBatch(
    actor: HermesProspectionActor,
    input: HermesCreateImportBatchInput,
  ) {
    return this.states.mutate(actor, async (state) => {
      const batch = buildHermesImportBatch({
        ...input,
        userId: actor.userId,
        now: new Date().toISOString(),
      });
      let result;

      try {
        result = claimHermesImportBatch(state, batch);
      } catch (error) {
        throw new ConflictException(
          error instanceof Error ? error.message : 'IMPORT_CONFLICT',
        );
      }
      await this.applySuppressions(actor.workspaceId, result.batch.rows);

      return result;
    });
  }

  async qualify(
    actor: HermesProspectionActor,
    input: HermesQualifyImportRowsInput,
  ) {
    return this.states.mutate(actor, async (state) => {
      const batch = state.batches.find((item) => item.id === input.batchId);

      if (!batch) throw new NotFoundException('IMPORT_BATCH_NOT_FOUND');
      const selected = batch.rows.filter((row) =>
        input.rowIds.includes(row.id),
      );

      if (selected.length !== input.rowIds.length)
        throw new BadRequestException('IMPORT_ROW_NOT_FOUND');
      await this.applySuppressions(actor.workspaceId, selected);
      const roleId = await this.roles.getRoleIdForUserWorkspace(actor);

      return this.orm.executeInWorkspaceContext(async () => {
        const permissions = buildEmailingRolePermissionConfig(roleId);
        const people = this.orm.getRepository(
          PersonWorkspaceEntity,
          permissions,
        );
        const companies = this.orm.getRepository(
          CompanyWorkspaceEntity,
          permissions,
        );

        for (const row of selected) {
          if (row.status !== 'pending' && row.status !== 'qualified') continue;
          // Include deleted records: an import must never resurrect an opted-out
          // or archived contact automatically, nor create its duplicate.
          const matchingPeople = await people
            .createQueryBuilder('person')
            .withDeleted()
            .where(
              'LOWER("person"."emailsPrimaryEmail") = :email OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE("person"."emailsAdditionalEmails", \'[]\'::jsonb)) AS email(value) WHERE LOWER(email.value) = :email)',
              { email: row.email },
            )
            .take(2)
            .getMany<PersonWorkspaceEntity>();
          const matchingCompanies = await companies
            .createQueryBuilder('company')
            .withDeleted()
            .where('LOWER(TRIM("company"."name")) = :name', {
              name: row.companyName.toLowerCase(),
            })
            .take(2)
            .getMany<CompanyWorkspaceEntity>();
          const person = matchingPeople[0];
          const company = matchingCompanies[0];

          if (
            matchingPeople.length > 1 ||
            matchingCompanies.length > 1 ||
            person?.deletedAt ||
            company?.deletedAt ||
            (person &&
              (!person.companyId ||
                !company ||
                person.companyId !== company.id))
          ) {
            row.status = 'conflict';
            row.errors = ['existing_contact_or_company_requires_review'];
            continue;
          }
          const companyId = company?.id ?? randomUUID();
          const personId = person?.id ?? row.id;

          // Stable person ID plus email matching makes recovery idempotent if
          // native ORM commits before the staging transaction completes.
          await this.orm.runInWorkspaceTransaction(async (transaction) => {
            if (!company)
              await transaction
                .getRepository<CompanyWorkspaceEntity>('company', permissions)
                .insert({ id: companyId, name: row.companyName, position: 0 });
            if (!person)
              await transaction
                .getRepository<PersonWorkspaceEntity>('person', permissions)
                .insert({
                  id: personId,
                  companyId,
                  position: 0,
                  name: {
                    firstName: row.firstName ?? '',
                    lastName: row.lastName ?? '',
                  },
                  emails: { primaryEmail: row.email, additionalEmails: [] },
                  jobTitle: row.jobTitle || null,
                });
          });
          row.companyId = companyId;
          row.personId = personId;
          row.status = 'qualified';
          row.errors = [];
          row.qualification = {
            professionalPurpose: input.professionalPurpose,
            privacyNoticeUrl: input.privacyNoticeUrl,
            informationMethod: input.informationMethod,
            qualifiedAt:
              row.qualification?.qualifiedAt ?? new Date().toISOString(),
            qualifiedByUserId: actor.userId,
          };
        }

        return { batchId: batch.id, rows: selected };
      });
    });
  }

  async createCampaignDraft(
    actor: HermesProspectionActor,
    input: HermesCreateCampaignDraftInput,
  ) {
    return this.states.mutate(actor, async (state) => {
      if (state.campaignIds.length >= HERMES_IMPORT_LIMITS.campaigns)
        throw new ConflictException('CAMPAIGN_LIMIT_REACHED');
      const rows = state.batches
        .flatMap((batch) => batch.rows)
        .filter((row) => input.rowIds.includes(row.id));

      if (rows.length !== input.rowIds.length)
        throw new BadRequestException('IMPORT_ROW_NOT_FOUND');
      await this.applySuppressions(actor.workspaceId, rows);
      if (
        rows.some(
          (row) =>
            row.status !== 'qualified' || !row.personId || !row.qualification,
        )
      ) {
        throw new BadRequestException(
          'RECIPIENTS_MUST_BE_QUALIFIED_AND_NOT_SUPPRESSED',
        );
      }
      const roleId = await this.roles.getRoleIdForUserWorkspace(actor);
      const campaignId = v5(
        JSON.stringify({
          workspaceId: actor.workspaceId,
          name: input.name,
          subject: input.subject,
          rowIds: [...input.rowIds].sort(),
        }),
        v5.URL,
      );
      const listId = v5('list', campaignId);

      await this.orm.executeInWorkspaceContext(async () => {
        const permissions = buildEmailingRolePermissionConfig(roleId);

        await this.orm.runInWorkspaceTransaction(async (transaction) => {
          const existing = await transaction
            .getRepository<MessageCampaignWorkspaceEntity>(
              'messageCampaign',
              permissions,
            )
            .findOne({ where: { id: campaignId } });

          if (existing) return;
          const personIds = [
            ...new Set(
              rows
                .map((row) => row.personId)
                .filter((id): id is string => !!id),
            ),
          ];
          const people = await transaction
            .getRepository<PersonWorkspaceEntity>('person', permissions)
            .find({ where: { id: In(personIds) } });

          if (
            rows.some(
              (row) =>
                !people.some(
                  (person) =>
                    person.id === row.personId &&
                    person.emails?.primaryEmail?.trim().toLowerCase() ===
                      row.email,
                ),
            )
          ) {
            throw new BadRequestException(
              'RECIPIENT_PRIMARY_EMAIL_CHANGED_OR_UNAVAILABLE',
            );
          }
          await transaction
            .getRepository<MessageListWorkspaceEntity>(
              'messageList',
              permissions,
            )
            .insert({ id: listId, name: input.name, position: 0 });
          await transaction
            .getRepository<MessageListMemberWorkspaceEntity>(
              'messageListMember',
              permissions,
            )
            .insert(
              personIds.map((personId, position) => ({
                id: randomUUID(),
                listId,
                personId,
                position,
              })),
            );
          await transaction
            .getRepository<MessageCampaignWorkspaceEntity>(
              'messageCampaign',
              permissions,
            )
            .insert({
              id: campaignId,
              listId,
              name: input.name,
              subject: input.subject,
              status: MessageCampaignStatus.DRAFT,
            });
        });
      });
      if (!state.campaignIds.includes(campaignId))
        state.campaignIds.push(campaignId);

      return {
        campaignId,
        listId,
        status: MessageCampaignStatus.DRAFT,
        sendingAvailable: false,
      };
    });
  }

  private async applySuppressions(
    workspaceId: string,
    rows: HermesImportRow[],
  ) {
    const suppressions = await this.suppressions.findApplicableSuppressions({
      workspaceId,
      emailAddresses: rows.map((row) => row.email),
    });
    const blocked = new Set(
      suppressions
        .filter((item) => item.reason !== 'TRACKING')
        .map((item) => item.emailAddress.trim().toLowerCase()),
    );

    for (const row of rows) {
      if (blocked.has(row.email)) {
        row.status = 'suppressed';
        row.errors = ['email_suppressed'];
      }
    }
  }
}
