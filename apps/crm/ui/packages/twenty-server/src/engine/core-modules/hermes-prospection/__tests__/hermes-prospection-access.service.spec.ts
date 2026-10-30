import { ForbiddenException } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';

jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock('src/engine/metadata-modules/role-target/role-target.entity', () => ({
  RoleTargetEntity: class RoleTargetEntity {},
}));

const actor = {
  workspaceId: 'workspace-a',
  userId: 'user-a',
  userWorkspaceId: 'membership-a',
};
const unrestrictedRole = () => ({
  workspaceId: actor.workspaceId,
  canUpdateAllSettings: true,
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  fieldPermissions: [],
  rowLevelPermissionPredicates: [],
  rowLevelPermissionPredicateGroups: [],
});

const setup = () => {
  const memberships = {
    findOne: jest.fn().mockResolvedValue({ id: actor.userWorkspaceId }),
  };
  const roleTargets = {
    findOne: jest.fn().mockResolvedValue({ role: unrestrictedRole() }),
  };
  const service = new HermesProspectionAccessService(
    memberships as unknown as ConstructorParameters<
      typeof HermesProspectionAccessService
    >[0],
    roleTargets as unknown as ConstructorParameters<
      typeof HermesProspectionAccessService
    >[1],
  );

  return { service, memberships, roleTargets };
};

describe('Hermes unrestricted workspace-admin boundary', () => {
  it('checks live user/workspace membership and role in the same workspace', async () => {
    const { service, memberships, roleTargets } = setup();

    await expect(service.assertAllowed(actor)).resolves.toBeUndefined();
    expect(memberships.findOne).toHaveBeenCalledWith({
      where: {
        id: actor.userWorkspaceId,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        deletedAt: IsNull(),
        user: { id: actor.userId, disabled: false, deletedAt: IsNull() },
        workspace: {
          id: actor.workspaceId,
          activationStatus: 'ACTIVE',
          deletedAt: IsNull(),
        },
      },
    });
    expect(roleTargets.findOne.mock.calls[0][0].where).toEqual({
      userWorkspaceId: actor.userWorkspaceId,
      workspaceId: actor.workspaceId,
    });
  });

  it('rejects revoked membership before reading raw staged PII', async () => {
    const { service, memberships, roleTargets } = setup();

    memberships.findOne.mockResolvedValue(null);
    await expect(service.assertAllowed(actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(roleTargets.findOne).not.toHaveBeenCalled();
  });

  it('rejects a role that belongs to another workspace', async () => {
    const { service, roleTargets } = setup();

    roleTargets.findOne.mockResolvedValue({
      role: { ...unrestrictedRole(), workspaceId: 'workspace-b' },
    });
    await expect(service.assertAllowed(actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it.each([
    'canUpdateAllSettings',
    'canReadAllObjectRecords',
    'canUpdateAllObjectRecords',
  ])('rejects a role missing %s', async (permission) => {
    const { service, roleTargets } = setup();

    roleTargets.findOne.mockResolvedValue({
      role: { ...unrestrictedRole(), [permission]: false },
    });
    await expect(service.assertAllowed(actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it.each([
    'fieldPermissions',
    'rowLevelPermissionPredicates',
    'rowLevelPermissionPredicateGroups',
  ])(
    'does not expose staged records around an existing %s restriction',
    async (restriction) => {
      const { service, roleTargets } = setup();

      roleTargets.findOne.mockResolvedValue({
        role: { ...unrestrictedRole(), [restriction]: [{ id: 'restricted' }] },
      });
      await expect(service.assertAllowed(actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    },
  );
});
