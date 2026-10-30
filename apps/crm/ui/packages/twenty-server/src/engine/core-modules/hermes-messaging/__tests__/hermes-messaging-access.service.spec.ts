import { type EntityManager } from 'typeorm';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { HermesMessagingAccessService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service';
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service',
  () => ({ HermesProspectionAccessService: class {} }),
);
jest.mock('src/engine/metadata-modules/role-target/role-target.entity', () => ({
  RoleTargetEntity: class {},
}));
const actor = { workspaceId: 'a', userId: 'u', userWorkspaceId: 'm' };
const setup = (role: unknown) => {
  const membership = { assertAllowed: jest.fn().mockResolvedValue(undefined) };
  const targets = {
    findOne: jest.fn().mockResolvedValue(role ? { role } : null),
  };
  return {
    membership,
    targets,
    service: new HermesMessagingAccessService(
      membership as never,
      targets as never,
    ),
  };
};
describe('fresh inbox administrator boundary', () => {
  it('uses native live membership/field/row checks before any object-role query', async () => {
    const { service, membership, targets } = setup({
      workspaceId: 'a',
      objectPermissions: [],
    });
    membership.assertAllowed.mockRejectedValue(Error('REVOKED'));
    await expect(service.assertAllowed(actor)).rejects.toThrow('REVOKED');
    expect(targets.findOne).not.toHaveBeenCalled();
  });
  it('requires matching workspace role with freshly loaded object restrictions', async () => {
    for (const role of [
      null,
      { workspaceId: 'b', objectPermissions: [] },
      { workspaceId: 'a' },
    ])
      await expect(setup(role).service.assertAllowed(actor)).rejects.toThrow(
        'MESSAGING_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN',
      );
  });
  it('rejects explicit denied object permissions even if global read/settings bits allow access', async () => {
    await expect(
      setup({
        workspaceId: 'a',
        objectPermissions: [{ canReadObjectRecords: false }],
      }).service.assertAllowed(actor),
    ).rejects.toThrow('MESSAGING_REQUIRES_UNRESTRICTED_WORKSPACE_ADMIN');
  });
  it('allows unrestricted role and scopes the fresh role lookup to membership and workspace', async () => {
    const { service, targets } = setup({
      workspaceId: 'a',
      objectPermissions: [
        { canReadObjectRecords: true, canUpdateObjectRecords: true },
      ],
    });
    await service.assertAllowed(actor);
    expect(targets.findOne).toHaveBeenCalledWith({
      where: { workspaceId: 'a', userWorkspaceId: 'm' },
      relations: { role: { objectPermissions: true } },
    });
  });
  it('uses the supplied transaction for role queries and passes it to the live membership guard', async () => {
    const { service, membership, targets } = setup(null);
    const transactionTargets = {
      findOne: jest.fn().mockResolvedValue({
        role: { workspaceId: 'a', objectPermissions: [] },
      }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionTargets),
    };
    await service.assertAllowed(actor, manager as unknown as EntityManager);
    expect(membership.assertAllowed).toHaveBeenCalledWith(actor, manager);
    expect(manager.getRepository).toHaveBeenCalledWith(RoleTargetEntity);
    expect(transactionTargets.findOne).toHaveBeenCalledTimes(1);
    expect(targets.findOne).not.toHaveBeenCalled();
  });
});
