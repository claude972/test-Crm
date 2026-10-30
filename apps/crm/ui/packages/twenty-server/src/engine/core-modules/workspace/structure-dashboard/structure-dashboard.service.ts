import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { isDefined } from 'kovaa-lab-shared/utils';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { WorkspaceDomainsService } from 'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service';
import { UserWorkspaceAuthContextService } from 'src/engine/core-modules/user-workspace/services/user-workspace-auth-context.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceDiscoverability } from 'src/engine/core-modules/workspace/types/workspace-discoverability.type';
import { workspaceValidator } from 'src/engine/core-modules/workspace/workspace.validate';
import {
  HERMES_STRUCTURE_METRICS,
  HermesAuthorizedStructureDTO,
  HermesStructureDashboardDTO,
  HermesStructureDashboardRowDTO,
  HermesStructureMetricDTO,
  HermesStructureMetricKey,
  HermesStructureMetricStatus,
  HermesStructureMetricTotalDTO,
} from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.dto';
import {
  HERMES_DASHBOARD_MAX_STRUCTURES,
  HermesStructureDashboardInput,
} from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.input';
import { PermissionsException } from 'src/engine/metadata-modules/permissions/permissions.exception';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

export type HermesStructurePrincipal = {
  userId: string;
  currentWorkspaceId?: string;
  authProvider?: AuthProviderEnum;
};

const METRIC_KEYS = Object.keys(
  HERMES_STRUCTURE_METRICS,
) as HermesStructureMetricKey[];

@Injectable()
export class StructureDashboardService {
  constructor(
    @InjectRepository(UserWorkspaceEntity)
    private readonly membershipRepository: Repository<UserWorkspaceEntity>,
    private readonly authContextService: UserWorkspaceAuthContextService,
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly workspaceDomainsService: WorkspaceDomainsService,
  ) {}

  async authorizedStructures(
    principal: HermesStructurePrincipal,
  ): Promise<HermesAuthorizedStructureDTO[]> {
    const memberships = await this.memberships(principal);
    return memberships
      .filter(
        (membership) =>
          membership.workspace.workspaceDiscoverability !==
          WorkspaceDiscoverability.HIDDEN,
      )
      .map((membership) => this.structure(membership, principal));
  }

  async dashboard(
    principal: HermesStructurePrincipal,
    input: HermesStructureDashboardInput = {},
  ): Promise<HermesStructureDashboardDTO> {
    this.validatePeriod(input);
    const requestedIds = input.workspaceIds;
    if (
      isDefined(requestedIds) &&
      (new Set(requestedIds).size !== requestedIds.length ||
        requestedIds.length > HERMES_DASHBOARD_MAX_STRUCTURES)
    ) {
      throw new AuthException(
        'Invalid dashboard scope',
        AuthExceptionCode.INVALID_INPUT,
      );
    }
    const memberships = await this.memberships(principal);
    const explicitCurrentHidden =
      requestedIds?.length === 1 &&
      requestedIds[0] === principal.currentWorkspaceId;
    const allowed = memberships.filter(
      (membership) =>
        membership.workspace.workspaceDiscoverability !==
          WorkspaceDiscoverability.HIDDEN ||
        (explicitCurrentHidden &&
          membership.workspaceId === principal.currentWorkspaceId),
    );
    const selected = isDefined(requestedIds)
      ? requestedIds.map((id) =>
          allowed.find((membership) => membership.workspaceId === id),
        )
      : allowed;
    if (selected.some((membership) => !isDefined(membership))) this.denyScope();
    if (selected.length > HERMES_DASHBOARD_MAX_STRUCTURES) {
      throw new AuthException(
        'Select at most 100 structures',
        AuthExceptionCode.INVALID_INPUT,
      );
    }
    const structures: HermesStructureDashboardRowDTO[] = [];
    for (const membership of selected) {
      if (!isDefined(membership)) this.denyScope();
      structures.push({
        structure: this.structure(membership, principal),
        metrics: await this.metrics(membership, principal, input),
      });
    }
    // Recheck direct memberships before returning any names or counts collected during a revocation.
    const currentMemberships = await this.memberships(principal);
    for (const membership of selected) {
      if (!isDefined(membership)) this.denyScope();
      const current = currentMemberships.find(
        (candidate) =>
          candidate.id === membership.id &&
          candidate.workspaceId === membership.workspaceId,
      );
      if (
        !isDefined(current) ||
        (current.workspace.workspaceDiscoverability ===
          WorkspaceDiscoverability.HIDDEN &&
          !explicitCurrentHidden) ||
        this.requiresAuthentication(current, principal) !==
          this.requiresAuthentication(membership, principal)
      )
        this.denyScope();
    }
    return {
      generatedAt: new Date(),
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
      partial: structures.some((row) =>
        row.metrics.some(
          (metric) => metric.status !== HermesStructureMetricStatus.AVAILABLE,
        ),
      ),
      structures,
      totals: structures.length === 0 ? [] : this.totals(structures),
    };
  }

  private denyScope(): never {
    throw new AuthException(
      'Selected structures are not available',
      AuthExceptionCode.FORBIDDEN_EXCEPTION,
    );
  }

  private async memberships(
    principal: HermesStructurePrincipal,
  ): Promise<UserWorkspaceEntity[]> {
    return this.membershipRepository.find({
      where: {
        userId: principal.userId,
        deletedAt: IsNull(),
        user: { disabled: false, deletedAt: IsNull() },
        workspace: {
          deletedAt: IsNull(),
          activationStatus: In([
            WorkspaceActivationStatus.ACTIVE,
            WorkspaceActivationStatus.CREATED,
          ]),
        },
      },
      relations: { workspace: true, twoFactorAuthenticationMethods: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  private requiresAuthentication(
    membership: UserWorkspaceEntity,
    principal: HermesStructurePrincipal,
  ): boolean {
    if (membership.workspaceId === principal.currentWorkspaceId) return false;
    const workspace = membership.workspace;
    return (
      workspace.isTwoFactorAuthenticationEnforced ||
      membership.twoFactorAuthenticationMethods.length > 0 ||
      !isDefined(principal.authProvider) ||
      !workspaceValidator.isAuthEnabled(principal.authProvider, workspace)
    );
  }

  private structure(
    membership: UserWorkspaceEntity,
    principal: HermesStructurePrincipal,
  ): HermesAuthorizedStructureDTO {
    return {
      workspaceId: membership.workspaceId,
      displayName:
        membership.workspace.displayName ?? membership.workspace.subdomain,
      isCurrent: membership.workspaceId === principal.currentWorkspaceId,
      requiresAuthentication: this.requiresAuthentication(
        membership,
        principal,
      ),
      workspaceUrls: this.workspaceDomainsService.getWorkspaceUrls(
        membership.workspace,
      ),
    };
  }

  private validatePeriod(input: HermesStructureDashboardInput): void {
    for (const value of [input.periodStart, input.periodEnd]) {
      if (
        isDefined(value) &&
        (!(value instanceof Date) || !Number.isFinite(value.getTime()))
      ) {
        throw new AuthException(
          'Invalid dashboard period',
          AuthExceptionCode.INVALID_INPUT,
        );
      }
    }
    if (
      isDefined(input.periodStart) &&
      isDefined(input.periodEnd) &&
      input.periodStart >= input.periodEnd
    ) {
      throw new AuthException(
        'Invalid dashboard period',
        AuthExceptionCode.INVALID_INPUT,
      );
    }
  }

  private unavailableMetrics(
    status: HermesStructureMetricStatus,
  ): HermesStructureMetricDTO[] {
    return METRIC_KEYS.map((key) => ({ key, value: null, status }));
  }

  private async metrics(
    membership: UserWorkspaceEntity,
    principal: HermesStructurePrincipal,
    input: HermesStructureDashboardInput,
  ): Promise<HermesStructureMetricDTO[]> {
    if (this.requiresAuthentication(membership, principal))
      return this.unavailableMetrics(HermesStructureMetricStatus.FORBIDDEN);
    try {
      const context = await this.authContextService.resolve({
        workspaceId: membership.workspaceId,
        userWorkspaceId: membership.id,
      });
      if (
        context.user.id !== principal.userId ||
        context.workspace.id !== membership.workspaceId ||
        context.userWorkspaceId !== membership.id
      ) {
        this.denyScope();
      }
      return await this.workspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const metrics: HermesStructureMetricDTO[] = [];
          for (const key of METRIC_KEYS) {
            try {
              const objectName = HERMES_STRUCTURE_METRICS[key];
              const query = this.workspaceOrmManager
                .getRepositoryWithContextPermissions(objectName)
                .createQueryBuilder(objectName)
                .select(`${objectName}.id`);
              if (isDefined(input.periodStart))
                query.andWhere(`${objectName}.createdAt >= :periodStart`, {
                  periodStart: input.periodStart,
                });
              if (isDefined(input.periodEnd))
                query.andWhere(`${objectName}.createdAt < :periodEnd`, {
                  periodEnd: input.periodEnd,
                });
              const value = await query.getCount();
              if (!Number.isSafeInteger(value) || value < 0)
                throw new Error('Invalid count');
              metrics.push({
                key,
                value,
                status: HermesStructureMetricStatus.AVAILABLE,
              });
            } catch (error) {
              metrics.push({
                key,
                value: null,
                status:
                  error instanceof PermissionsException
                    ? HermesStructureMetricStatus.FORBIDDEN
                    : HermesStructureMetricStatus.UNAVAILABLE,
              });
            }
          }
          return metrics;
        },
        context,
      );
    } catch (error) {
      return this.unavailableMetrics(
        error instanceof AuthException || error instanceof PermissionsException
          ? HermesStructureMetricStatus.FORBIDDEN
          : HermesStructureMetricStatus.UNAVAILABLE,
      );
    }
  }

  private totals(
    rows: HermesStructureDashboardRowDTO[],
  ): HermesStructureMetricTotalDTO[] {
    return METRIC_KEYS.map((key) => {
      const metrics = rows.map((row) =>
        row.metrics.find((metric) => metric.key === key),
      );
      const available = metrics.filter(
        (metric): metric is HermesStructureMetricDTO & { value: number } =>
          isDefined(metric) &&
          metric.status === HermesStructureMetricStatus.AVAILABLE &&
          metric.value !== null,
      );
      const sum = available.reduce((total, metric) => total + metric.value, 0);
      const validSum = Number.isSafeInteger(sum);
      return {
        key,
        value: available.length > 0 && validSum ? sum : null,
        status: !validSum
          ? HermesStructureMetricStatus.UNAVAILABLE
          : available.length === rows.length
            ? HermesStructureMetricStatus.AVAILABLE
            : available.length > 0
              ? HermesStructureMetricStatus.PARTIAL
              : metrics.every(
                    (metric) =>
                      metric?.status === HermesStructureMetricStatus.FORBIDDEN,
                  )
                ? HermesStructureMetricStatus.FORBIDDEN
                : HermesStructureMetricStatus.UNAVAILABLE,
        contributingStructures: available.length,
        totalStructures: rows.length,
      };
    });
  }
}
