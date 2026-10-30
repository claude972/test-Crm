import { AsyncLocalStorage } from 'node:async_hooks';

import { AuthException } from 'src/engine/core-modules/auth/auth.exception';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { HermesStructureMetricStatus } from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.dto';
import { StructureDashboardService } from 'src/engine/core-modules/workspace/structure-dashboard/structure-dashboard.service';
import { WorkspaceDiscoverability } from 'src/engine/core-modules/workspace/types/workspace-discoverability.type';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { PermissionsException } from 'src/engine/metadata-modules/permissions/permissions.exception';

jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock('src/engine/core-modules/auth/auth.exception', () => ({
  AuthException: class extends Error {},
  AuthExceptionCode: {
    INVALID_INPUT: 'INVALID_INPUT',
    FORBIDDEN_EXCEPTION: 'FORBIDDEN_EXCEPTION',
  },
}));
jest.mock(
  'src/engine/metadata-modules/permissions/permissions.exception',
  () => ({ PermissionsException: class extends Error {} }),
);
jest.mock(
  'src/engine/core-modules/user-workspace/services/user-workspace-auth-context.service',
  () => ({ UserWorkspaceAuthContextService: class {} }),
);
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock(
  'src/engine/core-modules/domain/workspace-domains/services/workspace-domains.service',
  () => ({ WorkspaceDomainsService: class {} }),
);
jest.mock(
  'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars',
  () => ({ UUIDScalarType: String }),
);
jest.mock('kovaa-lab-shared/utils', () => ({
  isDefined: (value: unknown) => value !== undefined && value !== null,
}));
jest.mock('kovaa-lab-shared/workspace', () => ({
  WorkspaceActivationStatus: { ACTIVE: 'ACTIVE', CREATED: 'CREATED' },
}));

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const principal = (userId = 'u2') => ({
  userId,
  currentWorkspaceId: A,
  authProvider: AuthProviderEnum.Password,
});
const member = (
  workspaceId: string,
  userId = 'u2',
  overrides: Partial<WorkspaceEntity> = {},
) =>
  Object.assign(new UserWorkspaceEntity(), {
    id: `${userId}-${workspaceId}`,
    userId,
    workspaceId,
    deletedAt: null,
    twoFactorAuthenticationMethods: [],
    workspace: Object.assign(new WorkspaceEntity(), {
      id: workspaceId,
      displayName: `Structure ${workspaceId.slice(-1)}`,
      workspaceDiscoverability: WorkspaceDiscoverability.MEMBERS_AND_INVITEES,
      isPasswordAuthEnabled: true,
      isTwoFactorAuthenticationEnforced: false,
      ...overrides,
    }),
  });

type TestContext = {
  type: string;
  workspace: { id: string };
  userWorkspaceId: string;
  user: { id: string };
};

const setup = () => {
  const storage = new AsyncLocalStorage<TestContext>();
  const data = [member(A, 'u1'), member(A), member(B)];
  let memberships = data;
  const find = jest.fn(async (options: { where: { userId: string } }) =>
    memberships.filter(
      (membership) => membership.userId === options.where.userId,
    ),
  );
  const resolve = jest.fn(
    async ({
      workspaceId,
      userWorkspaceId,
    }: {
      workspaceId: string;
      userWorkspaceId: string;
    }) => ({
      type: 'user',
      workspace: { id: workspaceId },
      userWorkspaceId,
      user: {
        id:
          data.find((membership) => membership.id === userWorkspaceId)
            ?.userId ?? 'unknown',
      },
    }),
  );
  const denied = new Set<string>();
  const unavailable = new Set<string>();
  const counts = new Map<string, number>();
  const observedContexts: TestContext[] = [];
  const periodPredicates: { condition: string; parameters: object }[] = [];
  const getRepositoryWithContextPermissions = jest.fn((objectName: string) => {
    const context = storage.getStore();
    if (!context) throw new Error('Missing workspace context');
    observedContexts.push(context);
    const key = `${context.workspace.id}:${objectName}`;
    if (denied.has(key))
      throw new PermissionsException('Denied', 'PERMISSION_DENIED' as never);
    return {
      createQueryBuilder: jest.fn(() => {
        const builder = {
          select: jest.fn().mockReturnThis(),
          andWhere: jest.fn((condition: string, parameters: object) => {
            periodPredicates.push({ condition, parameters });
            return builder;
          }),
          getCount: jest.fn(async () => {
            if (unavailable.has(key))
              throw new Error('Private connection failure for C');
            return counts.get(key) ?? (context.workspace.id === A ? 2 : 7);
          }),
        };
        return builder;
      }),
    };
  });
  const executeInWorkspaceContext = jest.fn(
    async (callback: () => Promise<unknown>, context: TestContext) =>
      storage.run(context, callback),
  );
  const service = new StructureDashboardService(
    { find } as never,
    { resolve } as never,
    { getRepositoryWithContextPermissions, executeInWorkspaceContext } as never,
    {
      getWorkspaceUrls: () => ({ subdomainUrl: 'https://preview.vercel.app' }),
    } as never,
  );
  return {
    service,
    find,
    resolve,
    getRepositoryWithContextPermissions,
    executeInWorkspaceContext,
    denied,
    unavailable,
    counts,
    observedContexts,
    periodPredicates,
    setMemberships: (next: UserWorkspaceEntity[]) => {
      memberships = next;
    },
    memberships: data,
  };
};

describe('Hermes authorized structure dashboard', () => {
  it('lists direct memberships only and never advertises C or technical admin scope', async () => {
    const { service, find } = setup();
    expect(
      (await service.authorizedStructures(principal('u1'))).map(
        (structure) => structure.workspaceId,
      ),
    ).toEqual([A]);
    expect(
      (await service.authorizedStructures(principal())).map(
        (structure) => structure.workspaceId,
      ),
    ).toEqual([A, B]);
    expect(find.mock.calls[0][0].where.userId).toBe('u1');
    expect(find.mock.calls[0][0].where).toMatchObject({
      user: { disabled: false },
    });
  });

  it('sums only A+B under each actual user membership and its own workspace context', async () => {
    const { service, observedContexts } = setup();
    const result = await service.dashboard(principal());
    expect(result.structures.map((row) => row.structure.workspaceId)).toEqual([
      A,
      B,
    ]);
    expect(
      result.totals.every(
        (total) => total.value === 9 && total.contributingStructures === 2,
      ),
    ).toBe(true);
    expect(result.partial).toBe(false);
    expect(
      observedContexts.every(
        (context) => context.type === 'user' && context.user.id === 'u2',
      ),
    ).toBe(true);
    expect(observedContexts.map((context) => context.userWorkspaceId)).toEqual([
      ...Array(4).fill(`u2-${A}`),
      ...Array(4).fill(`u2-${B}`),
    ]);
  });

  it.each([[B], [A, C], [C]])(
    'rejects forged scope %j before business reads',
    async (...ids) => {
      const { service, resolve, getRepositoryWithContextPermissions } = setup();
      await expect(
        service.dashboard(principal('u1'), { workspaceIds: ids }),
      ).rejects.toThrow('Selected structures are not available');
      expect(resolve).not.toHaveBeenCalled();
      expect(getRepositoryWithContextPermissions).not.toHaveBeenCalled();
    },
  );

  it('supports one selected structure and an explicitly empty scope without global fallback', async () => {
    const { service } = setup();
    const selected = await service.dashboard(principal(), {
      workspaceIds: [B],
    });
    expect(selected.totals[0].value).toBe(7);
    const empty = await service.dashboard(principal(), { workspaceIds: [] });
    expect(empty.structures).toEqual([]);
    expect(empty.totals).toEqual([]);
    expect(
      (await service.dashboard(principal('no-membership'))).totals,
    ).toEqual([]);
  });

  it('returns null FORBIDDEN rather than zero when B denies reading people', async () => {
    const { service, denied } = setup();
    denied.add(`${B}:person`);
    const result = await service.dashboard(principal());
    expect(
      result.structures[1].metrics.find((metric) => metric.key === 'people'),
    ).toEqual({
      key: 'people',
      value: null,
      status: HermesStructureMetricStatus.FORBIDDEN,
    });
    expect(
      result.totals.find((metric) => metric.key === 'people'),
    ).toMatchObject({
      value: 2,
      status: 'PARTIAL',
      contributingStructures: 1,
      totalStructures: 2,
    });
    expect(result.partial).toBe(true);
  });

  it('preserves a real zero and reports unavailable metrics without private error text', async () => {
    const { service, unavailable, counts } = setup();
    unavailable.add(`${B}:task`);
    counts.set(`${A}:task`, 0);
    const result = await service.dashboard(principal());
    expect(
      result.structures[0].metrics.find((metric) => metric.key === 'tasks'),
    ).toMatchObject({ value: 0, status: 'AVAILABLE' });
    expect(
      result.structures[1].metrics.find((metric) => metric.key === 'tasks'),
    ).toMatchObject({ value: null, status: 'UNAVAILABLE' });
    expect(JSON.stringify(result)).not.toContain('Private connection failure');
  });

  it('applies explicit UTC half-open createdAt predicates in each structure', async () => {
    const { service, periodPredicates } = setup();
    const periodStart = new Date('2026-10-01T00:00:00.000Z');
    const periodEnd = new Date('2026-11-01T00:00:00.000Z');
    await service.dashboard(principal(), { periodStart, periodEnd });
    expect(periodPredicates).toHaveLength(16);
    expect(periodPredicates[0]).toEqual({
      condition: 'company.createdAt >= :periodStart',
      parameters: { periodStart },
    });
    expect(periodPredicates[1]).toEqual({
      condition: 'company.createdAt < :periodEnd',
      parameters: { periodEnd },
    });
  });

  it('rejects invalid periods and duplicate IDs before membership or business reads', async () => {
    const { service, find } = setup();
    await expect(
      service.dashboard(principal(), { periodStart: new Date('invalid') }),
    ).rejects.toThrow('Invalid dashboard period');
    await expect(
      service.dashboard(principal(), {
        periodStart: new Date(2),
        periodEnd: new Date(1),
      }),
    ).rejects.toThrow('Invalid dashboard period');
    await expect(
      service.dashboard(principal(), { workspaceIds: [A, A] }),
    ).rejects.toThrow('Invalid dashboard scope');
    expect(find).not.toHaveBeenCalled();
  });

  it('excludes HIDDEN from selector and common scope but accepts only explicit current hidden context', async () => {
    const { service, setMemberships } = setup();
    setMemberships([
      member(A, 'u2', {
        workspaceDiscoverability: WorkspaceDiscoverability.HIDDEN,
      }),
      member(B),
    ]);
    expect(
      (await service.authorizedStructures(principal())).map(
        (structure) => structure.workspaceId,
      ),
    ).toEqual([B]);
    expect(
      (await service.dashboard(principal())).structures.map(
        (row) => row.structure.workspaceId,
      ),
    ).toEqual([B]);
    expect(
      (await service.dashboard(principal(), { workspaceIds: [A] }))
        .structures[0].structure.workspaceId,
    ).toBe(A);
    await expect(
      service.dashboard(principal(), { workspaceIds: [A, B] }),
    ).rejects.toThrow('Selected structures are not available');
  });

  it('does not use a password session in A to bypass SSO/2FA requirements in B', async () => {
    const { service, setMemberships, observedContexts } = setup();
    setMemberships([
      member(A),
      member(B, 'u2', {
        isPasswordAuthEnabled: false,
        isTwoFactorAuthenticationEnforced: true,
      }),
    ]);
    const result = await service.dashboard(principal());
    expect(result.structures[1].structure.requiresAuthentication).toBe(true);
    expect(
      result.structures[1].metrics.every(
        (metric) => metric.value === null && metric.status === 'FORBIDDEN',
      ),
    ).toBe(true);
    expect(
      observedContexts.every((context) => context.workspace.id === A),
    ).toBe(true);
  });

  it('removes a revoked membership on the next call without a dashboard cache', async () => {
    const { service, setMemberships } = setup();
    await service.dashboard(principal());
    setMemberships([member(A)]);
    const result = await service.dashboard(principal());
    expect(result.structures.map((row) => row.structure.workspaceId)).toEqual([
      A,
    ]);
    expect(result.totals[0].value).toBe(2);
    await expect(
      service.dashboard(principal(), { workspaceIds: [B] }),
    ).rejects.toThrow('Selected structures are not available');
  });

  it('fails the whole response generically if membership is revoked while metrics are loading', async () => {
    const { service, find, memberships } = setup();
    find.mockResolvedValueOnce(
      memberships.filter((membership) => membership.userId === 'u2'),
    );
    find.mockResolvedValueOnce([member(A)]);
    await expect(service.dashboard(principal())).rejects.toThrow(
      'Selected structures are not available',
    );
  });

  it('fails closed if a resolved context targets another structure', async () => {
    const { service, resolve, getRepositoryWithContextPermissions } = setup();
    resolve.mockResolvedValue({
      type: 'user',
      workspace: { id: C },
      userWorkspaceId: `u2-${A}`,
      user: { id: 'u2' },
    });
    const result = await service.dashboard(principal(), { workspaceIds: [A] });
    expect(getRepositoryWithContextPermissions).not.toHaveBeenCalled();
    expect(
      result.totals.every(
        (metric) => metric.value === null && metric.status === 'FORBIDDEN',
      ),
    ).toBe(true);
  });

  it('cannot turn an auth context for another user into a data read', async () => {
    const { service, resolve, getRepositoryWithContextPermissions } = setup();
    resolve.mockResolvedValue({
      type: 'user',
      workspace: { id: A },
      userWorkspaceId: `u2-${A}`,
      user: { id: 'other-user' },
    });
    const result = await service.dashboard(principal(), { workspaceIds: [A] });
    expect(getRepositoryWithContextPermissions).not.toHaveBeenCalled();
    expect(
      result.totals.every(
        (metric) => metric.value === null && metric.status === 'FORBIDDEN',
      ),
    ).toBe(true);
  });
});
