import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { type DataSource, In } from 'typeorm';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';

import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { type AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { type WorkspaceAgnosticTokenService } from 'src/engine/core-modules/auth/token/services/workspace-agnostic-token.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { fromUserEntityToFlat } from 'src/engine/core-modules/user/utils/from-user-entity-to-flat.util';
import {
  HermesAuthorizedStructureDTO,
  HermesStructureDashboardDTO,
} from 'src/engine/core-modules/workspace/structure-dashboard/dtos/hermes-structure-dashboard.dto';
import { type WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceDiscoverability } from 'src/engine/core-modules/workspace/types/workspace-discoverability.type';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { type ObjectPermissionService } from 'src/engine/metadata-modules/object-permission/object-permission.service';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';

// The wrapper must guard before native reset and harness globalSetup.
assert.equal(
  process.env.GITHUB_ACTIONS,
  'true',
  'Run this suite only in disposable CI',
);
const database = new URL(process.env.PG_DATABASE_URL ?? '');
assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '5432');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');

const A = SEED_APPLE_WORKSPACE_ID;
const B = SEED_YCOMBINATOR_WORKSPACE_ID;
const C = randomUUID();
const UNKNOWN = randomUUID();
const fixtureSuffix = randomUUID();
const C_NAME = `Hermes forbidden C ${fixtureSuffix}`;
// A future, explicit fixture period excludes pre-existing seed rows and asynchronous seed jobs.
const PERIOD_START = '2050-01-01T00:00:00.000Z';
const PERIOD_END = '2050-02-01T00:00:00.000Z';
// ISO values cross the globalSetup/test VM boundary without Date identity checks.
const INSIDE = '2050-01-15T12:00:00.000Z';

type PublicError = {
  message: string;
  path?: (string | number)[];
  extensions?: { code?: string };
};
type ApiResult<TData> = { data?: TData; errors?: PublicError[] };
type FixtureUser = { user: UserEntity; token: string };

const DASHBOARD_QUERY = `query HermesDashboard($input:HermesStructureDashboardInput) {
  hermesStructureDashboard(input:$input) {
    partial
    structures { structure { workspaceId displayName } metrics { key value status } }
    totals { key value status contributingStructures totalStructures }
  }
}`;
const STRUCTURES_QUERY =
  'query { hermesAuthorizedStructures { workspaceId displayName isCurrent requiresAuthentication } }';

const api = async <TData>(
  token: string,
  query: string,
  variables: object = {},
): Promise<ApiResult<TData>> => {
  const response = await request(`http://127.0.0.1:${APP_PORT}`)
    .post('/metadata')
    .set('Authorization', `Bearer ${token}`)
    .send({ query, variables });
  if (response.status !== 200)
    throw new Error(`Unexpected metadata HTTP status ${response.status}`);
  return response.body as ApiResult<TData>;
};

const successful = <TData>(result: ApiResult<TData>): TData => {
  // Do not dump response bodies: authentication fixture tokens must stay out of CI logs.
  if (result.errors?.length || !result.data) {
    const diagnostics = result.errors?.map(({ message, path, extensions }) => ({
      code: extensions?.code?.replace(/[^A-Z0-9_]/gi, '').slice(0, 80),
      path: path?.map((part) =>
        typeof part === 'number'
          ? part
          : part.replace(/[^a-z0-9_]/gi, '').slice(0, 80),
      ),
      message: message
        .replace(
          /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
          '[redacted-token]',
        )
        .replace(/Bearer\s+\S+/gi, '[redacted-authorization]')
        .replace(
          /(?:password|secret|token|authorization)\s*[:=]\s*\S+/gi,
          '[redacted-credential]',
        )
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 240),
    }));
    throw new Error(
      `Metadata fixture operation failed: ${JSON.stringify(diagnostics ?? [])}`,
    );
  }
  return result.data;
};

describe('Hermes structure dashboard — real isolated A/B/C authorization', () => {
  const userIds: string[] = [];
  const inserted = new Map<string, Map<string, string[]>>();
  const memberWorkspaces = new Set([A, B]);
  let u1: FixtureUser;
  let u2: FixtureUser;
  let u3: FixtureUser;
  let u0: FixtureUser;

  const createUser = async (label: string): Promise<UserEntity> => {
    const id = randomUUID();
    userIds.push(id);
    return getCoreRepository<UserEntity>(UserEntity).save({
      id,
      email: `hermes-${fixtureSuffix}-${label}@example.com`,
      firstName: 'Hermes',
      lastName: label,
      locale: 'en',
      passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
      isEmailVerified: true,
      disabled: false,
      canAccessFullAdminPanel: false,
      canImpersonate: false,
    });
  };

  const accessFor = async (
    user: UserEntity,
    workspaceId: string,
  ): Promise<string> => {
    const issued = await getAppProviderByClassName<AccessTokenService>(
      'AccessTokenService',
    ).generateAccessToken({
      userId: user.id,
      workspaceId,
      authProvider: AuthProviderEnum.Password,
    });
    return issued.token;
  };

  const fixtureRecords = async (
    workspaceId: string,
    quantities: Record<string, number>,
  ) => {
    const manager = getAppProviderByClassName<WorkspaceOrmManager>(
      'WorkspaceOrmManager',
    );
    const byObject = new Map<string, string[]>();
    inserted.set(workspaceId, byObject);
    await manager.executeInWorkspaceContext(async () => {
      for (const [objectName, count] of Object.entries(quantities)) {
        const ids: string[] = [];
        byObject.set(objectName, ids);
        const repository = manager.getRepository(
          objectName,
          { shouldBypassPermissionChecks: true },
          { shouldSkipEventEmission: true },
        );
        for (let index = 0; index < count; index++) {
          const id = randomUUID();
          ids.push(id);
          const label =
            objectName === 'person'
              ? {
                  name: { firstName: 'Same', lastName: 'Synthetic client' },
                  emails: {
                    // Distinct per person locally, identical across structures by index.
                    primaryEmail: `hermes-${fixtureSuffix}-person-${index}@example.com`,
                    additionalEmails: [],
                  },
                }
              : objectName === 'task'
                ? { title: 'Synthetic follow-up' }
                : { name: 'Same synthetic company' };
          await repository.insert({
            id,
            ...label,
            createdAt:
              workspaceId === A && objectName === 'company' && index === 0
                ? PERIOD_START
                : INSIDE,
            position: index + 1,
          });
        }
      }
      // Exact boundaries and soft deletion must not inflate A's visible company count.
      if (workspaceId === A) {
        const repository = manager.getRepository(
          'company',
          { shouldBypassPermissionChecks: true },
          { shouldSkipEventEmission: true },
        );
        const extra = [
          { id: randomUUID(), createdAt: '2049-12-31T23:59:59.999Z' },
          { id: randomUUID(), createdAt: PERIOD_END },
          {
            id: randomUUID(),
            createdAt: INSIDE,
            deletedAt: new Date().toISOString(),
          },
        ];
        byObject.get('company')?.push(...extra.map((row) => row.id));
        for (const row of extra)
          await repository.insert({
            ...row,
            name: 'Excluded synthetic company',
            position: 100,
          });
      }
    }, buildSystemAuthContext(workspaceId));
  };

  const dashboardResult = async (token: string, workspaceIds?: string[]) =>
    api<{ hermesStructureDashboard: HermesStructureDashboardDTO }>(
      token,
      DASHBOARD_QUERY,
      {
        input: {
          ...(workspaceIds === undefined ? {} : { workspaceIds }),
          periodStart: PERIOD_START,
          periodEnd: PERIOD_END,
        },
      },
    );
  const dashboard = async (token: string, workspaceIds?: string[]) =>
    successful(await dashboardResult(token, workspaceIds))
      .hermesStructureDashboard;

  beforeAll(async () => {
    const coreDataSource = getAppProviderByClassName<DataSource>('DataSource');
    assert.ok(
      coreDataSource.isInitialized,
      'Nest core datasource must be initialized',
    );
    for (const entity of [UserEntity, WorkspaceEntity, UserWorkspaceEntity]) {
      assert.ok(
        coreDataSource.hasMetadata(entity.name),
        'Core fixture entity metadata must be registered',
      );
    }
    const workspaceRepository =
      getCoreRepository<WorkspaceEntity>(WorkspaceEntity);
    const a = await workspaceRepository.findOneByOrFail({ id: A });
    const b = await workspaceRepository.findOneByOrFail({ id: B });
    const userWorkspaceService =
      getAppProviderByClassName<UserWorkspaceService>('UserWorkspaceService');
    const roleService = getAppProviderByClassName<RoleService>('RoleService');
    const adminA = await roleService.getRoleByUniversalIdentifier({
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      workspaceId: A,
    });
    assert.ok(adminA);
    const user1 = await createUser('u1');
    const user2 = await createUser('u2');
    const user3 = await createUser('u3');
    const user0 = await createUser('u0');
    await userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
      user1,
      a,
      adminA.id,
    );
    await userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
      user2,
      a,
      adminA.id,
    );

    const { workspaceCustomFlatApplication } =
      await getAppProviderByClassName<ApplicationService>(
        'ApplicationService',
      ).findWorkspaceKovaaLabCRMStandardAndCustomApplicationOrThrow({
        workspaceId: B,
      });
    const restrictedRole = await roleService.createRole({
      workspaceId: B,
      ownerFlatApplication: workspaceCustomFlatApplication,
      input: {
        label: `Hermes restricted ${fixtureSuffix}`,
        canReadAllObjectRecords: true,
        canUpdateAllObjectRecords: false,
        canSoftDeleteAllObjectRecords: false,
        canDestroyAllObjectRecords: false,
        canUpdateAllSettings: false,
        canBeAssignedToUsers: true,
        canBeAssignedToAgents: false,
        canBeAssignedToApiKeys: false,
      },
    });
    const { flatObjectMetadataMaps } =
      await getAppProviderByClassName<WorkspaceCacheService>(
        'WorkspaceCacheService',
      ).getOrRecompute(B, ['flatObjectMetadataMaps']);
    const person = Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    ).find((object) => object?.nameSingular === 'person');
    assert.ok(person);
    await getAppProviderByClassName<ObjectPermissionService>(
      'ObjectPermissionService',
    ).upsertObjectPermissions({
      workspaceId: B,
      input: {
        roleId: restrictedRole.id,
        objectPermissions: [
          {
            objectMetadataId: person.id,
            canReadObjectRecords: false,
            canUpdateObjectRecords: false,
            canSoftDeleteObjectRecords: false,
            canDestroyObjectRecords: false,
          },
        ],
      },
    });
    await userWorkspaceService.addUserToWorkspaceIfUserNotInWorkspace(
      user2,
      b,
      restrictedRole.id,
    );

    const customApplicationId = randomUUID();
    const c = await coreDataSource.transaction(async (manager) => {
      const queryRunner = manager.queryRunner;
      assert.ok(
        queryRunner,
        'Native workspace creation requires one transaction',
      );
      const pendingWorkspace = await manager
        .getRepository<WorkspaceEntity>('WorkspaceEntity')
        .save({
          id: C,
          displayName: C_NAME,
          subdomain: `hermes-ci-${fixtureSuffix}`,
          inviteHash: randomUUID(),
          activationStatus: WorkspaceActivationStatus.PENDING_CREATION,
          workspaceCustomApplicationId: customApplicationId,
          workspaceDiscoverability:
            WorkspaceDiscoverability.MEMBERS_AND_INVITEES,
          isPasswordAuthEnabled: true,
          isTwoFactorAuthenticationEnforced: false,
        });
      await getAppProviderByClassName<ApplicationService>(
        'ApplicationService',
      ).createWorkspaceCustomApplication(
        {
          workspaceId: C,
          applicationId: customApplicationId,
        },
        queryRunner,
      );
      return pendingWorkspace;
    });
    await userWorkspaceService.create({
      userId: user3.id,
      workspaceId: C,
      isExistingUser: true,
      locale: 'en',
    });
    await getAppProviderByClassName<WorkspaceService>(
      'WorkspaceService',
    ).activateWorkspace(fromUserEntityToFlat(user3), c);
    memberWorkspaces.add(C);

    await fixtureRecords(A, { company: 2, person: 4, opportunity: 1, task: 3 });
    await fixtureRecords(B, { company: 3, person: 6, opportunity: 2, task: 4 });
    await fixtureRecords(C, { company: 5, person: 8, opportunity: 4, task: 6 });
    u1 = { user: user1, token: await accessFor(user1, A) };
    u2 = { user: user2, token: await accessFor(user2, A) };
    u3 = { user: user3, token: await accessFor(user3, C) };
    u0 = {
      user: user0,
      token: (
        await getAppProviderByClassName<WorkspaceAgnosticTokenService>(
          'WorkspaceAgnosticTokenService',
        ).generateWorkspaceAgnosticToken({
          userId: user0.id,
          authProvider: AuthProviderEnum.Password,
        })
      ).token,
    };
  }, 300_000);

  afterAll(async () => {
    // Only fixture UUIDs are removed. C's schema and its fixture role remain in this disposable DB until runner teardown.
    const manager = getAppProviderByClassName<WorkspaceOrmManager>(
      'WorkspaceOrmManager',
    );
    for (const [workspaceId, objects] of inserted) {
      await manager.executeInWorkspaceContext(async () => {
        for (const [objectName, ids] of [...objects].reverse()) {
          if (ids.length)
            await manager
              .getRepository(
                objectName,
                { shouldBypassPermissionChecks: true },
                { shouldSkipEventEmission: true },
              )
              .delete({ id: In(ids) });
        }
      }, buildSystemAuthContext(workspaceId));
    }
    const memberships = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).find({ where: { userId: In(userIds) }, withDeleted: true });
    for (const membership of memberships)
      await getAppProviderByClassName<UserWorkspaceService>(
        'UserWorkspaceService',
      ).deleteUserWorkspace({
        workspaceId: membership.workspaceId,
        userWorkspaceId: membership.id,
      });
    for (const workspaceId of memberWorkspaces) {
      await manager.executeInWorkspaceContext(async () => {
        if (userIds.length)
          await manager
            .getRepository(
              'workspaceMember',
              { shouldBypassPermissionChecks: true },
              { shouldSkipEventEmission: true },
            )
            .delete({ userId: In(userIds) });
      }, buildSystemAuthContext(workspaceId));
    }
    if (userIds.length)
      await getCoreRepository<UserEntity>(UserEntity).delete({
        id: In(userIds),
      });
  }, 120_000);

  it('U1 sees A only; U2 sees A+B; C is not advertised', async () => {
    const first = successful(
      await api<{ hermesAuthorizedStructures: HermesAuthorizedStructureDTO[] }>(
        u1.token,
        STRUCTURES_QUERY,
      ),
    );
    const second = successful(
      await api<{ hermesAuthorizedStructures: HermesAuthorizedStructureDTO[] }>(
        u2.token,
        STRUCTURES_QUERY,
      ),
    );
    expect(
      first.hermesAuthorizedStructures.map(
        (structure) => structure.workspaceId,
      ),
    ).toEqual([A]);
    expect(
      new Set(
        second.hermesAuthorizedStructures.map(
          (structure) => structure.workspaceId,
        ),
      ),
    ).toEqual(new Set([A, B]));
    expect(JSON.stringify(second)).not.toContain(C_NAME);
  });

  it('counts actual visible ORM rows with period boundaries and soft deletion excluded', async () => {
    const result = await dashboard(u1.token);
    expect(result.structures).toHaveLength(1);
    expect(
      result.totals.map(({ key, value, status }) => ({ key, value, status })),
    ).toEqual([
      { key: 'companies', value: 2, status: 'AVAILABLE' },
      { key: 'people', value: 4, status: 'AVAILABLE' },
      { key: 'opportunities', value: 1, status: 'AVAILABLE' },
      { key: 'tasks', value: 3, status: 'AVAILABLE' },
    ]);
  });

  it('aggregates A+B while excluding people denied by U2 actual B role', async () => {
    const result = await dashboard(u2.token);
    expect(result.structures).toHaveLength(2);
    expect(result.partial).toBe(true);
    expect(
      result.totals.find((metric) => metric.key === 'companies'),
    ).toMatchObject({
      value: 5,
      status: 'AVAILABLE',
      contributingStructures: 2,
      totalStructures: 2,
    });
    expect(
      result.totals.find((metric) => metric.key === 'people'),
    ).toMatchObject({
      value: 4,
      status: 'PARTIAL',
      contributingStructures: 1,
      totalStructures: 2,
    });
    expect(
      result.structures
        .find((row) => row.structure.workspaceId === B)
        ?.metrics.find((metric) => metric.key === 'people'),
    ).toMatchObject({ value: null, status: 'FORBIDDEN' });
    const selected = await dashboard(u2.token, [B]);
    expect(
      selected.totals.find((metric) => metric.key === 'companies')?.value,
    ).toBe(3);
  });

  it('C contains actual isolated data readable only to its own fixture member', async () => {
    const result = await dashboard(u3.token);
    expect(result.structures.map((row) => row.structure.workspaceId)).toEqual([
      C,
    ]);
    expect(
      result.totals.find((metric) => metric.key === 'companies')?.value,
    ).toBe(5);
  });

  it('rejects forged B/C/unknown scope with the same generic error and no private structure name', async () => {
    const forbiddenB = await dashboardResult(u1.token, [B]);
    const forbiddenC = await dashboardResult(u1.token, [C]);
    const unknown = await dashboardResult(u1.token, [UNKNOWN]);
    expect(forbiddenB.errors?.length).toBeGreaterThan(0);
    expect(
      forbiddenC.errors?.map(({ message, extensions }) => ({
        message,
        code: extensions?.code,
      })),
    ).toEqual(
      unknown.errors?.map(({ message, extensions }) => ({
        message,
        code: extensions?.code,
      })),
    );
    expect(JSON.stringify(forbiddenC)).not.toContain(C_NAME);
    expect(
      (await dashboardResult(u2.token, [A, C])).errors?.length,
    ).toBeGreaterThan(0);
  });

  it('returns an empty scope for an authenticated account with no memberships', async () => {
    const result = await dashboard(u0.token);
    expect(result.structures).toEqual([]);
    expect(result.totals).toEqual([]);
  });

  it('removes B immediately after native membership revocation and refuses its forged filter', async () => {
    const membership = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).findOneByOrFail({ userId: u2.user.id, workspaceId: B });
    await getAppProviderByClassName<UserWorkspaceService>(
      'UserWorkspaceService',
    ).deleteUserWorkspace({
      userWorkspaceId: membership.id,
      workspaceId: B,
      softDelete: true,
    });
    const result = await dashboard(u2.token);
    expect(result.structures.map((row) => row.structure.workspaceId)).toEqual([
      A,
    ]);
    expect(
      result.totals.find((metric) => metric.key === 'companies')?.value,
    ).toBe(2);
    expect(
      (await dashboardResult(u2.token, [B])).errors?.length,
    ).toBeGreaterThan(0);
  });
});
