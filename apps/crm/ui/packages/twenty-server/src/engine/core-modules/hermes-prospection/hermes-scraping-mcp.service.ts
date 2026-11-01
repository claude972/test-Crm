import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, type EntityManager } from 'typeorm';
import { z } from 'zod';
import { ApiKeyEntity } from 'src/engine/core-modules/api-key/api-key.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type McpToolSet } from 'src/engine/api/mcp/types/mcp-tool-set.type';
import { HermesProspectionAccessService } from './hermes-prospection-access.service';
import { HermesProspectionService } from './hermes-prospection.service';
import { hermesIntakeBodySchema } from './intake/hermes-intake.schema';

const depositSchema = hermesIntakeBodySchema.extend({
  collectedAt: z.string().datetime({ offset: true }),
  sourceUrl: z
    .string()
    .url()
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    }),
  ownerUserWorkspaceId: z.string().uuid(),
  originalRequest: z.string().trim().min(1).max(4000),
});

@Injectable()
export class HermesScrapingMcpService {
  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly prospection: HermesProspectionService,
    private readonly access: HermesProspectionAccessService,
  ) {}

  private async assertKey(
    workspaceId: string,
    apiKeyId: string,
    manager?: EntityManager,
  ) {
    const source = manager ?? this.source;
    const key = await source
      .getRepository(ApiKeyEntity)
      .findOneBy({ id: apiKeyId, workspaceId, revokedAt: IsNull() });
    if (!key || new Date(key.expiresAt).getTime() <= Date.now())
      throw new ForbiddenException('MCP_KEY_UNAVAILABLE');
    const target = await source.getRepository(RoleTargetEntity).findOne({
      where: { apiKeyId, workspaceId },
      relations: {
        role: {
          fieldPermissions: true,
          rowLevelPermissionPredicates: true,
          rowLevelPermissionPredicateGroups: true,
        },
      },
    });
    const role = target?.role;
    if (
      !role ||
      role.workspaceId !== workspaceId ||
      !role.canUpdateAllSettings ||
      !role.canReadAllObjectRecords ||
      !role.canUpdateAllObjectRecords ||
      role.fieldPermissions.length ||
      role.rowLevelPermissionPredicates.length ||
      role.rowLevelPermissionPredicateGroups.length
    )
      throw new ForbiddenException('MCP_SCRAPING_REQUIRES_ADMIN');
  }

  private async owner(workspaceId: string, userWorkspaceId: string) {
    const member = await this.source
      .getRepository(UserWorkspaceEntity)
      .findOneBy({ id: userWorkspaceId, workspaceId, deletedAt: IsNull() });
    if (!member) throw new ForbiddenException('MCP_REQUEST_OWNER_UNAVAILABLE');
    const actor = { workspaceId, userId: member.userId, userWorkspaceId };
    await this.access.assertAllowed(actor);
    return actor;
  }

  tools(workspaceId: string, apiKeyId: string): McpToolSet {
    const read = {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    };
    return {
      list_scraping_owners: {
        description:
          'List eligible request owners in this CRM workspace. Use the returned membership ID when depositing prospects.',
        inputSchema: z.object({}).strict(),
        annotations: read,
        execute: async () => {
          await this.assertKey(workspaceId, apiKeyId);
          const members = await this.source
            .getRepository(UserWorkspaceEntity)
            .find({
              where: { workspaceId, deletedAt: IsNull() },
              relations: { user: true },
              take: 100,
            });
          const owners = [];
          for (const member of members) {
            try {
              await this.owner(workspaceId, member.id);
              owners.push({
                ownerUserWorkspaceId: member.id,
                name: [member.user.firstName, member.user.lastName]
                  .filter(Boolean)
                  .join(' '),
              });
            } catch (error) {
              if (!(error instanceof ForbiddenException)) throw error;
            }
          }
          await this.assertKey(workspaceId, apiKeyId);
          return { owners };
        },
      },
      deposit_scraped_prospects: {
        description:
          'Store a dated scraping collection for review, with the original owner request, company category, contact names, company, address, email, phone and social URLs. Same externalBatchId is idempotent; changed content is refused. This stages prospects and does not send mail.',
        inputSchema: depositSchema,
        annotations: {
          readOnlyHint: false,
          openWorldHint: false,
          destructiveHint: false,
        },
        execute: async (raw) => {
          const { ownerUserWorkspaceId, ...input } = depositSchema.parse(raw);
          await this.assertKey(workspaceId, apiKeyId);
          const actor = await this.owner(workspaceId, ownerUserWorkspaceId);
          return this.prospection.createBatch(actor, input, {
            apiKeyId,
            assertLive: (manager) =>
              this.assertKey(workspaceId, apiKeyId, manager),
          });
        },
      },
      list_scraping_collections: {
        description:
          'Read the prospect reception collections for an eligible request owner in this CRM workspace.',
        inputSchema: z
          .object({ ownerUserWorkspaceId: z.string().uuid() })
          .strict(),
        annotations: read,
        execute: async ({ ownerUserWorkspaceId }) => {
          await this.assertKey(workspaceId, apiKeyId);
          const result = await this.prospection.list(
            await this.owner(workspaceId, ownerUserWorkspaceId),
          );
          await this.assertKey(workspaceId, apiKeyId);
          return result;
        },
      },
    };
  }
}
