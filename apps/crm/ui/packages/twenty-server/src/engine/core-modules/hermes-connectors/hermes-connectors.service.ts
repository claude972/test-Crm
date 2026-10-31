import { HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesConnectedEvolutionAdapter } from './evolution/hermes-connected-evolution.adapter';
import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import { IsNull, Repository } from 'typeorm';

import { HermesEvolutionConnectionDTO } from 'src/engine/core-modules/hermes-connectors/dto/hermes-evolution-connection.dto';
import { EvolutionConnectionAdapter } from 'src/engine/core-modules/hermes-connectors/evolution/evolution-connection.adapter';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

export type HermesConnectorActor = {
  workspaceId: string;
  userId: string;
  userWorkspaceId: string;
};

@Injectable()
export class HermesConnectorsService {
  constructor(
    @InjectRepository(UserWorkspaceEntity)
    private readonly memberships: Repository<UserWorkspaceEntity>,
    @InjectRepository(RoleTargetEntity)
    private readonly roleTargets: Repository<RoleTargetEntity>,
    private readonly config: KovaaLabCRMConfigService,
    @Optional() private readonly central?: HermesConnectionsService,
  ) {}

  async evolutionConnection(
    actor: HermesConnectorActor,
  ): Promise<HermesEvolutionConnectionDTO> {
    await this.assertAllowed(actor);

    // The transport is awaited in its own try, so a provider failure stays a
    // provider failure and nothing else is swallowed with it.
    let probed: Awaited<
      ReturnType<EvolutionConnectionAdapter['probe']>
    > | null = null;

    try {
      probed = this.central
        ? await new HermesConnectedEvolutionAdapter(
            this.central,
          ).connectionState(actor.workspaceId)
        : await new EvolutionConnectionAdapter(
            this.config.get('HERMES_EVOLUTION_CONNECTIONS'),
          ).probe(actor.workspaceId);
    } catch {
      probed = null;
    }

    // The caller's rights, re-affirmed after the I/O and deliberately OUTSIDE
    // the catch above. `resolve` revalidates the CONFIGURATOR, not the caller,
    // so a second administrator revoked mid-probe would otherwise receive
    // private provider state. Raising it here also stops a 403 being
    // disguised as « the provider is unreachable », which would send the
    // operator to debug a provider that is perfectly fine.
    await this.assertAllowed(actor);

    if (probed === null) {
      return {
        workspaceId: actor.workspaceId,
        provider: 'EVOLUTION',
        status: 'UNAVAILABLE',
        providerState: null,
        checkedAt: new Date(),
        errorCode: 'REQUEST_FAILED',
      };
    }

    return { ...probed, checkedAt: new Date(probed.checkedAt) };
  }

  private async assertAllowed(actor: HermesConnectorActor): Promise<void> {
    const membership = await this.memberships.findOne({
      where: {
        id: actor.userWorkspaceId,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
        deletedAt: IsNull(),
        user: { id: actor.userId, disabled: false, deletedAt: IsNull() },
        workspace: {
          id: actor.workspaceId,
          deletedAt: IsNull(),
          activationStatus: WorkspaceActivationStatus.ACTIVE,
        },
      },
    });

    if (!membership) throw new ForbiddenException('CONNECTOR_ACCESS_DENIED');
    const target = await this.roleTargets.findOne({
      where: { userWorkspaceId: membership.id, workspaceId: actor.workspaceId },
      relations: {
        role: {
          fieldPermissions: true,
          rowLevelPermissionPredicates: true,
          rowLevelPermissionPredicateGroups: true,
        },
      },
    });
    const role = target?.role;

    // Provider state is restricted to live unrestricted administrators until
    // connection-specific read policies are available for this integration.
    if (
      !role ||
      role.workspaceId !== actor.workspaceId ||
      !role.canUpdateAllSettings ||
      !role.canReadAllObjectRecords ||
      !role.canUpdateAllObjectRecords ||
      role.fieldPermissions.length > 0 ||
      role.rowLevelPermissionPredicates.length > 0 ||
      role.rowLevelPermissionPredicateGroups.length > 0
    ) {
      throw new ForbiddenException(
        'CONNECTOR_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN',
      );
    }
  }
}
