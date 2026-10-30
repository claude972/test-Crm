import { ForbiddenException } from '@nestjs/common';

import { EvolutionConnectionAdapter } from 'src/engine/core-modules/hermes-connectors/evolution/evolution-connection.adapter';
import { HermesConnectorsService } from 'src/engine/core-modules/hermes-connectors/hermes-connectors.service';

jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock('src/engine/metadata-modules/role-target/role-target.entity', () => ({
  RoleTargetEntity: class RoleTargetEntity {},
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class KovaaLabCRMConfigService {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-connectors/evolution/evolution-connection.adapter',
  () => ({ EvolutionConnectionAdapter: jest.fn() }),
);

const actor = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  userId: 'user-a',
  userWorkspaceId: 'membership-a',
};
const otherWorkspaceId = '22222222-2222-4222-8222-222222222222';
const role = () => ({
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
    findOne: jest.fn().mockResolvedValue({ role: role() }),
  };
  const config = { get: jest.fn().mockReturnValue('{}') };
  const probe = jest.fn().mockResolvedValue({
    workspaceId: actor.workspaceId,
    provider: 'EVOLUTION',
    status: 'PROVIDER_REPORTED_OPEN',
    providerState: 'open',
    checkedAt: '2026-10-30T04:00:00Z',
    errorCode: null,
  });

  jest
    .mocked(EvolutionConnectionAdapter)
    .mockClear()
    .mockImplementation(
      () => ({ probe }) as unknown as EvolutionConnectionAdapter,
    );
  const service = new HermesConnectorsService(
    memberships as unknown as ConstructorParameters<
      typeof HermesConnectorsService
    >[0],
    roleTargets as unknown as ConstructorParameters<
      typeof HermesConnectorsService
    >[1],
    config as unknown as ConstructorParameters<
      typeof HermesConnectorsService
    >[2],
  );

  return { service, memberships, roleTargets, config, probe };
};

describe('Hermes connector workspace authorization', () => {
  it('checks live membership, enabled user and active workspace before loading secrets or probing', async () => {
    const { service, memberships, roleTargets, config, probe } = setup();
    const result = await service.evolutionConnection(actor);

    expect(memberships.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: actor.userWorkspaceId,
        userId: actor.userId,
        workspaceId: actor.workspaceId,
        user: expect.objectContaining({ id: actor.userId, disabled: false }),
        workspace: expect.objectContaining({
          id: actor.workspaceId,
          activationStatus: 'ACTIVE',
        }),
      }),
    });
    expect(roleTargets.findOne.mock.calls[0][0].where).toEqual({
      userWorkspaceId: actor.userWorkspaceId,
      workspaceId: actor.workspaceId,
    });
    expect(config.get).toHaveBeenCalledWith('HERMES_EVOLUTION_CONNECTIONS');
    expect(EvolutionConnectionAdapter).toHaveBeenCalledWith('{}');
    expect(probe).toHaveBeenCalledWith(actor.workspaceId);
    expect(result.status).toBe('PROVIDER_REPORTED_OPEN');
    expect(result.checkedAt).toEqual(new Date('2026-10-30T04:00:00Z'));
  });

  it('never constructs or calls the adapter for a missing/revoked membership or disabled user', async () => {
    const { service, memberships, roleTargets, config, probe } = setup();

    memberships.findOne.mockResolvedValue(null);
    await expect(service.evolutionConnection(actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(roleTargets.findOne).not.toHaveBeenCalled();
    expect(config.get).not.toHaveBeenCalled();
    expect(EvolutionConnectionAdapter).not.toHaveBeenCalled();
    expect(probe).not.toHaveBeenCalled();
  });

  it('rechecks role revocation on every query rather than trusting a previous allowed probe', async () => {
    const { service, roleTargets, probe } = setup();

    await service.evolutionConnection(actor);
    roleTargets.findOne.mockResolvedValue(null);
    await expect(service.evolutionConnection(actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(probe).toHaveBeenCalledTimes(1);
    expect(EvolutionConnectionAdapter).toHaveBeenCalledTimes(1);
  });

  it.each([
    { workspaceId: otherWorkspaceId },
    { canUpdateAllSettings: false },
    { canReadAllObjectRecords: false },
    { canUpdateAllObjectRecords: false },
    { fieldPermissions: [{ id: 'restricted' }] },
    { rowLevelPermissionPredicates: [{ id: 'restricted' }] },
    { rowLevelPermissionPredicateGroups: [{ id: 'restricted' }] },
  ])(
    'refuses non-admin, foreign and restricted roles without touching provider config: %j',
    async (restriction) => {
      const { service, roleTargets, config, probe } = setup();

      roleTargets.findOne.mockResolvedValue({
        role: { ...role(), ...restriction },
      });
      await expect(service.evolutionConnection(actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(config.get).not.toHaveBeenCalled();
      expect(EvolutionConnectionAdapter).not.toHaveBeenCalled();
      expect(probe).not.toHaveBeenCalled();
    },
  );

  it('does not fall back to another workspace, even if only that workspace is configured', async () => {
    const { service, config, probe } = setup();

    config.get.mockReturnValue(
      JSON.stringify({
        [otherWorkspaceId]: {
          baseUrl: 'https://provider.example.test',
          instanceName: 'other-instance',
          apiKey: 'synthetic-placeholder',
        },
      }),
    );
    await service.evolutionConnection(actor);
    expect(probe).toHaveBeenCalledWith(actor.workspaceId);
    expect(probe).not.toHaveBeenCalledWith(otherWorkspaceId);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('fails closed on database failure before reading configuration', async () => {
    const { service, memberships, config, probe } = setup();

    memberships.findOne.mockRejectedValue(new Error('Database unavailable'));
    await expect(service.evolutionConnection(actor)).rejects.toThrow(
      'Database unavailable',
    );
    expect(config.get).not.toHaveBeenCalled();
    expect(probe).not.toHaveBeenCalled();
  });

  it('does not expose invalid configuration or unexpected adapter diagnostics', async () => {
    const { service, probe } = setup();

    jest.mocked(EvolutionConnectionAdapter).mockImplementationOnce(() => {
      throw new Error('synthetic-sensitive-config-content');
    });
    const result = await service.evolutionConnection(actor);

    expect(result).toMatchObject({
      workspaceId: actor.workspaceId,
      status: 'UNAVAILABLE',
      providerState: null,
      errorCode: 'REQUEST_FAILED',
    });
    expect(JSON.stringify(result)).not.toContain(
      'synthetic-sensitive-config-content',
    );
    expect(probe).not.toHaveBeenCalled();
  });
});
