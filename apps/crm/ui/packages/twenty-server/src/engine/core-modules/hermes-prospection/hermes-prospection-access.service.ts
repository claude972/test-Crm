import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { type HermesProspectionActor } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';

@Injectable()
export class HermesProspectionAccessService {
  constructor(
    @InjectRepository(UserWorkspaceEntity)
    private readonly memberships: Repository<UserWorkspaceEntity>,
    @InjectRepository(RoleTargetEntity)
    private readonly roleTargets: Repository<RoleTargetEntity>,
  ) {}

  async assertAllowed(actor: HermesProspectionActor): Promise<void> {
    const membership = await this.memberships.findOne({
      where: {
        id: actor.userWorkspaceId,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
      },
    });

    if (!membership) throw new ForbiddenException('PROSPECTION_ACCESS_DENIED');

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

    // Raw staging data has no per-record policy yet; restrict this first slice
    // to unrestricted workspace administrators instead of bypassing record ACLs.
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
        'PROSPECTION_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN',
      );
    }
  }
}
