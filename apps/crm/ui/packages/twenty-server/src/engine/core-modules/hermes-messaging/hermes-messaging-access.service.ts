import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, Repository } from 'typeorm';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

@Injectable()
export class HermesMessagingAccessService {
  constructor(
    private readonly membershipAccess: HermesProspectionAccessService,
    @InjectRepository(RoleTargetEntity)
    private readonly targets: Repository<RoleTargetEntity>,
  ) {}
  async assertAllowed(
    actor: HermesMessagingActor,
    manager?: EntityManager,
  ): Promise<void> {
    await this.membershipAccess.assertAllowed(actor, manager);
    const targets = manager?.getRepository(RoleTargetEntity) ?? this.targets;
    const target = await targets.findOne({
      where: {
        workspaceId: actor.workspaceId,
        userWorkspaceId: actor.userWorkspaceId,
      },
      relations: { role: { objectPermissions: true } },
    });
    const role = target?.role;
    if (
      !role ||
      role.workspaceId !== actor.workspaceId ||
      !role.objectPermissions ||
      role.objectPermissions.some((permission) =>
        [
          permission.canReadObjectRecords,
          permission.canUpdateObjectRecords,
          permission.canSoftDeleteObjectRecords,
          permission.canDestroyObjectRecords,
        ].some((value) => value === false),
      )
    ) {
      throw new ForbiddenException(
        'MESSAGING_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN',
      );
    }
  }
}
