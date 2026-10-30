import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import request from 'supertest';
import { In } from 'typeorm';
import { FeatureFlagKey } from 'kovaa-lab-shared/types';

import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';

import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { type AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { type FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { type UnsubscribeTokenService } from 'src/engine/core-modules/emailing-domain/services/unsubscribe-token.service';
import { EmailingDomainDriver } from 'src/engine/core-modules/emailing-domain/drivers/types/emailing-domain-driver.type';
import { HermesImportStateEntity } from 'src/engine/core-modules/hermes-prospection/entities/hermes-import-state.entity';
import {
  type HermesImportBatch,
  type HermesImportRow,
  type HermesProspectionState,
} from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { type KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { RoleTargetEntity } from 'src/engine/metadata-modules/role-target/role-target.entity';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type MessageSuppressionService } from 'src/modules/emailing/services/message-suppression.service';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

// CI must enforce this target before native globalSetup can reset a database.
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable CI only');
const database = new URL(process.env.PG_DATABASE_URL ?? '');
assert.ok(['postgres:', 'postgresql:'].includes(database.protocol));
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '5432');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');

const A = SEED_APPLE_WORKSPACE_ID;
const B = SEED_YCOMBINATOR_WORKSPACE_ID;
const suffix = randomUUID().slice(0, 8);
const PREFIX = `hermes-prospection-${suffix}`;
const LIST = 'query { hermesImportBatches }';
const CREATE =
  'mutation Import($input:HermesCreateImportBatchInput!) { hermesCreateImportBatch(input:$input) }';
const QUALIFY =
  'mutation Qualify($input:HermesQualifyImportRowsInput!) { hermesQualifyImportRows(input:$input) }';
const DRAFT =
  'mutation Draft($input:HermesCreateCampaignDraftInput!) { hermesCreateCampaignDraft(input:$input) }';

type ApiResult<TData> = {
  data?: TData;
  errors?: { message: string; extensions?: { code?: string } }[];
};
type Fixture = {
  user: UserEntity;
  membership: UserWorkspaceEntity;
  token: string;
};
type DraftResult = {
  campaignId: string;
  listId: string;
  status: string;
  sendingAvailable: boolean;
};

const api = async <TData>(
  token: string | undefined,
  query: string,
  variables: object = {},
  allowDeniedStatus = false,
): Promise<ApiResult<TData>> => {
  const operation = request(`http://127.0.0.1:${APP_PORT}`).post('/metadata');
  if (token) operation.set('Authorization', `Bearer ${token}`);
  const response = await operation.send({ query, variables });

  if (response.status !== 200) {
    if (allowDeniedStatus && [401, 403].includes(response.status))
      return { errors: [{ message: 'HTTP authentication refused' }] };
    throw new Error('Unexpected metadata fixture HTTP status');
  }
  return response.body as ApiResult<TData>;
};
const successful = <TData>(result: ApiResult<TData>): TData => {
  if (result.errors?.length || !result.data)
    throw new Error('Hermes metadata fixture operation failed');
  return result.data;
};
const denied = (result: ApiResult<unknown>): void => {
  if (!result.errors?.length)
    throw new Error('Expected Hermes authorization or validation failure');
  expect(JSON.stringify(result.data ?? null).includes(PREFIX)).toBe(false);
};
const importInput = (
  label: string,
  email = `${PREFIX}-${label}@example.test`,
) => ({
  externalBatchId: `${PREFIX}-${label}`,
  name: `${PREFIX} ${label}`,
  sourceUrl: 'https://example.test/synthetic-directory',
  collectedAt: '2026-10-29T12:00:00.000Z',
  rows: [
    {
      email,
      companyName: `${PREFIX} Company ${label}`,
      firstName: 'Synthetic',
      lastName: 'Professional',
      jobTitle: 'Operations manager',
    },
  ],
});

const provider = getAppProviderByClassName;

describe('Hermes B2B prospection — real HTTP/native ORM A/B integration', () => {
  const users: UserEntity[] = [];
  const nativeIds = new Map<string, Map<string, Set<string>>>();
  const originalStates = new Map<string, HermesImportStateEntity | null>();
  const previousFeatureFlags = new Map<string, boolean>();
  let adminA: Fixture;
  let adminB: Fixture;
  let restricted: Fixture;
  let revokedRole: Fixture;
  let revokedMembership: Fixture;

  const remember = (
    workspaceId: string,
    objectName: string,
    ids: (string | undefined)[],
  ) => {
    const objects =
      nativeIds.get(workspaceId) ?? new Map<string, Set<string>>();
    nativeIds.set(workspaceId, objects);
    const set = objects.get(objectName) ?? new Set<string>();
    objects.set(objectName, set);
    for (const id of ids) if (id) set.add(id);
  };
  const workspace = <TData>(
    workspaceId: string,
    operation: (manager: WorkspaceOrmManager) => Promise<TData>,
  ) => {
    const manager = provider<WorkspaceOrmManager>('WorkspaceOrmManager');
    return manager.executeInWorkspaceContext(
      () => operation(manager),
      buildSystemAuthContext(workspaceId),
    );
  };
  const list = async (fixture: Fixture) =>
    successful(
      await api<{ hermesImportBatches: HermesProspectionState }>(
        fixture.token,
        LIST,
      ),
    ).hermesImportBatches;
  const create = async (
    fixture: Fixture,
    input: ReturnType<typeof importInput>,
  ) =>
    successful(
      await api<{
        hermesCreateImportBatch: { batch: HermesImportBatch; replay: boolean };
      }>(fixture.token, CREATE, { input }),
    ).hermesCreateImportBatch;
  const qualify = async (fixture: Fixture, batch: HermesImportBatch) => {
    const result = successful(
      await api<{
        hermesQualifyImportRows: { batchId: string; rows: HermesImportRow[] };
      }>(fixture.token, QUALIFY, {
        input: {
          batchId: batch.id,
          rowIds: batch.rows.map((row) => row.id),
          professionalPurpose:
            'Synthetic professional operations service relevant to this role',
          privacyNoticeUrl: 'https://example.test/privacy',
          informationMethod: 'first-contact-notice',
        },
      }),
    ).hermesQualifyImportRows;
    remember(
      fixture.membership.workspaceId,
      'person',
      result.rows.map((row) => row.personId),
    );
    remember(
      fixture.membership.workspaceId,
      'company',
      result.rows.map((row) => row.companyId),
    );
    return result;
  };
  const createUser = async (label: string) => {
    const user = await getCoreRepository<UserEntity>(UserEntity).save({
      id: randomUUID(),
      email: `${PREFIX}-${label}@example.test`,
      firstName: 'Synthetic',
      lastName: label,
      locale: 'en',
      passwordHash: await hashPassword(randomBytes(24).toString('base64url')),
      isEmailVerified: true,
      disabled: false,
      canAccessFullAdminPanel: false,
      canImpersonate: false,
    });
    users.push(user);
    return user;
  };
  const join = async (
    user: UserEntity,
    workspaceId: string,
    roleId: string,
  ): Promise<Fixture> => {
    const target = await getCoreRepository<WorkspaceEntity>(
      WorkspaceEntity,
    ).findOneByOrFail({ id: workspaceId });
    await provider<UserWorkspaceService>(
      'UserWorkspaceService',
    ).addUserToWorkspaceIfUserNotInWorkspace(user, target, roleId);
    const membership = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).findOneByOrFail({ userId: user.id, workspaceId });
    const issued = await provider<AccessTokenService>(
      'AccessTokenService',
    ).generateAccessToken({
      userId: user.id,
      workspaceId,
      authProvider: AuthProviderEnum.Password,
    });
    return { user, membership, token: issued.token };
  };

  beforeAll(async () => {
    assert.equal(
      provider<KovaaLabCRMConfigService>('KovaaLabCRMConfigService').get(
        'EMAILING_DOMAIN_DRIVER',
      ),
      EmailingDomainDriver.LOG,
      'This fixture requires the LOG campaign provider and sends no message',
    );
    const stateRepository = getCoreRepository<HermesImportStateEntity>(
      HermesImportStateEntity,
    );
    const roleService = provider<RoleService>('RoleService');
    const featureFlags = provider<FeatureFlagService>('FeatureFlagService');
    const administrators = new Map<string, string>();

    for (const workspaceId of [A, B]) {
      originalStates.set(
        workspaceId,
        await stateRepository.findOneBy({ workspaceId }),
      );
      previousFeatureFlags.set(
        workspaceId,
        await featureFlags.isFeatureEnabled(
          FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
          workspaceId,
        ),
      );
      await featureFlags.upsertWorkspaceFeatureFlag({
        workspaceId,
        featureFlag: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
        value: true,
      });
      const admin = await roleService.getRoleByUniversalIdentifier({
        universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
        workspaceId,
      });
      assert.ok(admin, 'Native standard administrator role is required');
      administrators.set(workspaceId, admin.id);
    }
    const admin = await createUser('admin');
    adminA = await join(admin, A, administrators.get(A)!);
    adminB = await join(admin, B, administrators.get(B)!);
    const { workspaceCustomFlatApplication } =
      await provider<ApplicationService>(
        'ApplicationService',
      ).findWorkspaceKovaaLabCRMStandardAndCustomApplicationOrThrow({
        workspaceId: A,
      });
    const viewer = await roleService.createRole({
      workspaceId: A,
      ownerFlatApplication: workspaceCustomFlatApplication,
      input: {
        label: `${PREFIX} restricted`,
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
    restricted = await join(await createUser('restricted'), A, viewer.id);
    revokedRole = await join(
      await createUser('role-revocation'),
      A,
      administrators.get(A)!,
    );
    revokedMembership = await join(
      await createUser('membership-revocation'),
      A,
      administrators.get(A)!,
    );
  }, 180_000);

  afterAll(async () => {
    if (!originalStates.size && !users.length) return;
    for (const workspaceId of [A, B]) {
      await workspace(workspaceId, async (manager) => {
        // Only known generated IDs and the unique fixture email prefix are removed.
        for (const objectName of [
          'messageListMember',
          'messageCampaign',
          'messageList',
          'person',
          'company',
        ]) {
          const ids = [...(nativeIds.get(workspaceId)?.get(objectName) ?? [])];
          if (ids.length)
            await manager
              .getRepository(
                objectName,
                { shouldBypassPermissionChecks: true },
                { shouldSkipEventEmission: true },
              )
              .delete({ id: In(ids) });
        }
        const suppressions = manager.getRepository(
          'messageSuppression',
          { shouldBypassPermissionChecks: true },
          { shouldSkipEventEmission: true },
        );
        const rows = await suppressions
          .createQueryBuilder('suppression')
          .where('"suppression"."emailAddress" LIKE :prefix', {
            prefix: `${PREFIX}%@example.test`,
          })
          .getMany<{ id: string }>();
        if (rows.length)
          await suppressions.delete({ id: In(rows.map((row) => row.id)) });
      });
      const stateRepository = getCoreRepository<HermesImportStateEntity>(
        HermesImportStateEntity,
      );
      const previous = originalStates.get(workspaceId);
      if (previous) await stateRepository.save(previous);
      else if (originalStates.has(workspaceId))
        await stateRepository.delete({ workspaceId });
      const previousFlag = previousFeatureFlags.get(workspaceId);
      if (previousFlag !== undefined)
        await provider<FeatureFlagService>(
          'FeatureFlagService',
        ).upsertWorkspaceFeatureFlag({
          workspaceId,
          featureFlag: FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
          value: previousFlag,
        });
    }
    if (users.length) {
      const memberships = await getCoreRepository<UserWorkspaceEntity>(
        UserWorkspaceEntity,
      ).find({
        where: { userId: In(users.map((user) => user.id)) },
        withDeleted: true,
      });
      for (const membership of memberships)
        await provider<UserWorkspaceService>(
          'UserWorkspaceService',
        ).deleteUserWorkspace({
          workspaceId: membership.workspaceId,
          userWorkspaceId: membership.id,
        });
      for (const workspaceId of [A, B])
        await workspace(workspaceId, async (manager) => {
          await manager
            .getRepository(
              'workspaceMember',
              { shouldBypassPermissionChecks: true },
              { shouldSkipEventEmission: true },
            )
            .delete({ userId: In(users.map((user) => user.id)) });
        });
      await getCoreRepository<UserEntity>(UserEntity).delete({
        id: In(users.map((user) => user.id)),
      });
    }
  }, 180_000);

  it('claims one durable batch through real HTTP, normalizes rows and replays identical content', async () => {
    const input = importInput('idempotent');
    const first = await create(adminA, input);
    const replay = await create(adminA, {
      ...input,
      rows: [
        { ...input.rows[0], email: ` ${input.rows[0].email.toUpperCase()} ` },
      ],
    });

    expect(first.replay).toBe(false);
    expect(replay.replay).toBe(true);
    expect(replay.batch.id).toBe(first.batch.id);
    expect(replay.batch.rows[0].id).toBe(first.batch.rows[0].id);
    expect(
      (await list(adminA)).batches.filter(
        (batch) => batch.externalBatchId === input.externalBatchId,
      ),
    ).toHaveLength(1);
    denied(
      await api(adminA.token, CREATE, {
        input: {
          ...input,
          rows: [{ ...input.rows[0], companyName: 'Different source content' }],
        },
      }),
    );
  });

  it('qualifies native contacts/companies once and isolates the same email and external source ID in A/B', async () => {
    const input = importInput('shared-identity');
    const a = await create(adminA, input);
    const b = await create(adminB, input);
    const qualifiedA = await qualify(adminA, a.batch);
    const qualifiedB = await qualify(adminB, b.batch);

    expect(qualifiedA.rows[0].status).toBe('qualified');
    expect(qualifiedB.rows[0].status).toBe('qualified');
    expect(qualifiedA.rows[0].personId).not.toBe(qualifiedB.rows[0].personId);
    expect(qualifiedA.rows[0].companyId).not.toBe(qualifiedB.rows[0].companyId);
    const repeated = await qualify(adminA, a.batch);
    expect(repeated.rows[0].personId).toBe(qualifiedA.rows[0].personId);
    for (const fixture of [adminA, adminB])
      await workspace(fixture.membership.workspaceId, async (manager) => {
        const people = await manager
          .getRepository('person', { shouldBypassPermissionChecks: true })
          .createQueryBuilder('person')
          .where('LOWER("person"."emailsPrimaryEmail") = :email', {
            email: input.rows[0].email,
          })
          .getMany<{ id: string; companyId: string }>();
        const companies = await manager
          .getRepository('company', { shouldBypassPermissionChecks: true })
          .find({ where: { name: input.rows[0].companyName } });
        expect(people).toHaveLength(1);
        expect(companies).toHaveLength(1);
        expect(people[0].companyId).toBe(companies[0].id);
      });
  });

  it('rejects a foreign batch and a restricted role without returning or changing staged/native data', async () => {
    const a = await create(adminA, importInput('foreign-batch'));
    const beforeB = JSON.stringify(await list(adminB));
    const qualifyInput = {
      batchId: a.batch.id,
      rowIds: [a.batch.rows[0].id],
      professionalPurpose: 'Synthetic professional role purpose',
      privacyNoticeUrl: 'https://example.test/privacy',
      informationMethod: 'already-informed',
    };

    denied(await api(adminB.token, QUALIFY, { input: qualifyInput }));
    expect(JSON.stringify(await list(adminB))).toBe(beforeB);
    denied(await api(restricted.token, LIST));
    denied(await api(restricted.token, QUALIFY, { input: qualifyInput }));
    denied(
      await api(restricted.token, CREATE, { input: importInput('forbidden') }),
    );
    expect(
      (await list(adminA)).batches.some(
        (batch) => batch.externalBatchId === `${PREFIX}-forbidden`,
      ),
    ).toBe(false);
  });

  it('creates a native DRAFT/list/audience exactly once without dispatching a message', async () => {
    const source = await create(adminA, importInput('draft'));
    const qualified = await qualify(adminA, source.batch);
    const input = {
      name: `${PREFIX} Draft`,
      subject: 'Synthetic professional message',
      rowIds: qualified.rows.map((row) => row.id),
    };
    const result = successful(
      await api<{ hermesCreateCampaignDraft: DraftResult }>(
        adminA.token,
        DRAFT,
        { input },
      ),
    ).hermesCreateCampaignDraft;
    const replay = successful(
      await api<{ hermesCreateCampaignDraft: DraftResult }>(
        adminA.token,
        DRAFT,
        { input },
      ),
    ).hermesCreateCampaignDraft;

    remember(A, 'messageCampaign', [result.campaignId]);
    remember(A, 'messageList', [result.listId]);
    expect(result.status).toBe('DRAFT');
    expect(replay.campaignId).toBe(result.campaignId);
    await workspace(A, async (manager) => {
      const campaign = await manager
        .getRepository('messageCampaign', {
          shouldBypassPermissionChecks: true,
        })
        .findOneByOrFail({ id: result.campaignId });
      const members = await manager
        .getRepository('messageListMember', {
          shouldBypassPermissionChecks: true,
        })
        .find({ where: { listId: result.listId } });
      remember(
        A,
        'messageListMember',
        members.map((member) => member.id),
      );
      expect(campaign.status).toBe('DRAFT');
      expect(campaign.sentAt).toBeNull();
      expect(campaign.scheduledAt).toBeNull();
      expect(members).toHaveLength(1);
      expect(members[0].personId).toBe(qualified.rows[0].personId);
      expect(
        await manager
          .getRepository('campaignDelivery', {
            shouldBypassPermissionChecks: true,
          })
          .countBy({ campaignId: result.campaignId }),
      ).toBe(0);
    });
  });

  it('keeps unsubscribe GET nonmutating and POST opposition durable across replay and reimport, scoped to A', async () => {
    const email = `${PREFIX}-unsubscribe@example.test`;
    const sourceA = await create(adminA, importInput('unsubscribe-a', email));
    const sourceB = await create(adminB, importInput('unsubscribe-b', email));
    await qualify(adminA, sourceA.batch);
    const suppressionService = provider<MessageSuppressionService>(
      'MessageSuppressionService',
    );
    const applicable = (workspaceId: string) =>
      suppressionService.findApplicableSuppressions({
        workspaceId,
        emailAddresses: [email],
      });
    const token = provider<UnsubscribeTokenService>(
      'UnsubscribeTokenService',
    ).sign({ workspaceId: A, emailAddress: email });

    expect(await applicable(A)).toHaveLength(0);
    const preferences = await request(`http://127.0.0.1:${APP_PORT}`)
      .get('/emailing/unsubscribe')
      .query({ t: token });
    if (preferences.status !== 200)
      throw new Error('Synthetic unsubscribe preference GET failed');
    expect(await applicable(A)).toHaveLength(0);
    for (let replay = 0; replay < 2; replay++) {
      const response = await request(`http://127.0.0.1:${APP_PORT}`)
        .post('/emailing/unsubscribe')
        .query({ t: token })
        .type('form')
        .send({ 'List-Unsubscribe': 'One-Click' });
      if (response.status !== 200)
        throw new Error('Synthetic signed unsubscribe POST failed');
    }
    const opposition = await applicable(A);
    expect(opposition).toHaveLength(1);
    expect(opposition[0].reason).toBe('UNSUBSCRIBE');
    expect(await applicable(B)).toHaveLength(0);
    const reimport = await create(
      adminA,
      importInput('unsubscribe-reimport', email),
    );
    expect(reimport.batch.rows[0].status).toBe('suppressed');
    expect((await qualify(adminA, reimport.batch)).rows[0].status).toBe(
      'suppressed',
    );
    expect((await qualify(adminB, sourceB.batch)).rows[0].status).toBe(
      'qualified',
    );
    denied(
      await api(adminA.token, DRAFT, {
        input: {
          name: `${PREFIX} blocked`,
          subject: 'Must never send',
          rowIds: [reimport.batch.rows[0].id],
        },
      }),
    );
    expect(await applicable(A)).toHaveLength(1);
  });

  it('refuses a formerly authorized token immediately after its role target is revoked in the DB', async () => {
    await list(revokedRole);
    await getCoreRepository<RoleTargetEntity>(RoleTargetEntity).delete({
      workspaceId: A,
      userWorkspaceId: revokedRole.membership.id,
    });
    denied(await api(revokedRole.token, LIST, {}, true));
    denied(
      await api(
        revokedRole.token,
        CREATE,
        { input: importInput('revoked-role') },
        true,
      ),
    );
    expect(
      (await list(adminA)).batches.some(
        (batch) => batch.externalBatchId === `${PREFIX}-revoked-role`,
      ),
    ).toBe(false);
  });

  it('refuses an existing token after native membership soft revocation without deleting opposition or imports', async () => {
    const before = JSON.stringify(await list(adminA));
    await list(revokedMembership);
    await provider<UserWorkspaceService>(
      'UserWorkspaceService',
    ).deleteUserWorkspace({
      workspaceId: A,
      userWorkspaceId: revokedMembership.membership.id,
      softDelete: true,
    });
    const response = await request(`http://127.0.0.1:${APP_PORT}`)
      .post('/metadata')
      .set('Authorization', `Bearer ${revokedMembership.token}`)
      .send({ query: LIST });
    if (response.status === 200) denied(response.body as ApiResult<unknown>);
    else expect([401, 403]).toContain(response.status);
    expect(JSON.stringify(await list(adminA))).toBe(before);
  });
});
