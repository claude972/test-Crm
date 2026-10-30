import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { type DataSource, In, IsNull } from 'typeorm';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';
import { type AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
import { hashPassword } from 'src/engine/core-modules/auth/auth.util';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';
import { type RoleService } from 'src/engine/metadata-modules/role/role.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { type HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { type HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import {
  type HermesMessagingAdapter,
  type HermesMessagingEvent,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

// The wrapper must guard/reset disposable services BEFORE the native globalSetup runs.
assert.equal(process.env.GITHUB_ACTIONS, 'true');
const database = new URL(process.env.PG_DATABASE_URL ?? '');
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '5432');
assert.equal(database.pathname, '/p0_ci');
assert.equal(database.search, '');
const A = SEED_APPLE_WORKSPACE_ID,
  B = SEED_YCOMBINATOR_WORKSPACE_ID;
const suffix = randomUUID(),
  connection = `fixture-${suffix}`,
  email = `inbox-${suffix}@example.com`;
const provider = getAppProviderByClassName;
type Result = {
  data?: Record<string, unknown>;
  errors?: { extensions?: { code?: string }; path?: unknown[] }[];
};
const api = async (
  token: string | undefined,
  query: string,
  variables: object = {},
) => {
  const operation = request(`http://127.0.0.1:${APP_PORT}`).post('/metadata');
  if (token) operation.set('Authorization', `Bearer ${token}`);
  const response = await operation.send({ query, variables });
  if ([401, 403].includes(response.status))
    return { errors: [{ extensions: { code: 'HTTP_DENIED' } }] } as Result;
  assert.equal(response.status, 200, 'Metadata HTTP status');
  return response.body as Result;
};
const successful = (result: Result) => {
  if (result.errors?.length || !result.data)
    throw Error(
      `Inbox operation failed: ${JSON.stringify(result.errors?.map((error) => ({ code: error.extensions?.code, path: error.path })))}`,
    );
  return result.data;
};
const LIST =
  'query { hermesInboxConversations { items { id contactHandle personId personMatchStatus } nextCursor } }';
const MESSAGES =
  'query Messages($input:HermesInboxMessagesInput!){hermesInboxMessages(input:$input){items{id text status errorCode direction} nextCursor}}';
const REPLY =
  'mutation Reply($input:HermesInboxReplyInput!){hermesInboxReply(input:$input){id status text errorCode}}';

// Only the transport is a fixture; persistence, authorization and GraphQL run natively.
describe('Hermes inbox — real HTTP/core SQL and native Person matching', () => {
  const users: UserEntity[] = [];
  const people = new Map<string, string>();
  const memberships: UserWorkspaceEntity[] = [];
  let tokenA: string, tokenB: string, revokedToken: string;
  let a: { conversationId: string; messageId: string }, b: typeof a;
  let getAdapter: jest.SpyInstance;
  let sends = 0,
    uncertain = false;
  const messageService = () =>
    provider<HermesMessagingService>('HermesMessagingService');
  const event = (workspaceId: string): HermesMessagingEvent => ({
    workspaceId,
    channel: 'EMAIL',
    direction: 'INBOUND',
    providerConnectionId: connection,
    providerMessageId: 'same-provider-message',
    providerConversationId: 'same-provider-thread',
    contactHandle: email,
    text: `${suffix} Incoming`,
    occurredAt: new Date().toISOString(),
    subject: 'Synthetic inbox',
  });
  const createUser = async (label: string) => {
    const user = await getCoreRepository<UserEntity>(UserEntity).save({
      id: randomUUID(),
      email: `${label}-${suffix}@example.com`,
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
  const join = async (user: UserEntity, workspaceId: string) => {
    const workspace = await getCoreRepository<WorkspaceEntity>(
      WorkspaceEntity,
    ).findOneByOrFail({ id: workspaceId });
    const role = await provider<RoleService>(
      'RoleService',
    ).getRoleByUniversalIdentifier({
      workspaceId,
      universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
    });
    assert.ok(role);
    await provider<UserWorkspaceService>(
      'UserWorkspaceService',
    ).addUserToWorkspaceIfUserNotInWorkspace(user, workspace, role.id);
    const membership = await getCoreRepository<UserWorkspaceEntity>(
      UserWorkspaceEntity,
    ).findOneByOrFail({ workspaceId, userId: user.id });
    memberships.push(membership);
    return (
      await provider<AccessTokenService>(
        'AccessTokenService',
      ).generateAccessToken({
        userId: user.id,
        workspaceId,
        authProvider: AuthProviderEnum.Password,
      })
    ).token;
  };
  beforeAll(async () => {
    const user = await createUser('inbox');
    tokenA = await join(user, A);
    tokenB = await join(user, B);
    revokedToken = await join(await createUser('revoked'), A);
    const orm = provider<WorkspaceOrmManager>('WorkspaceOrmManager');
    for (const workspaceId of [A, B]) {
      const id = randomUUID();
      people.set(workspaceId, id);
      await orm.executeInWorkspaceContext(async () => {
        await orm
          .getRepository(
            'person',
            { shouldBypassPermissionChecks: true },
            { shouldSkipEventEmission: true },
          )
          .insert({
            id,
            name: { firstName: 'Inbox', lastName: 'Synthetic' },
            emails: { primaryEmail: email, additionalEmails: [] },
            position: 1,
          });
      }, buildSystemAuthContext(workspaceId));
    }
    const registry = provider<HermesMessagingAdapterRegistry>(
      'HermesMessagingAdapterRegistry',
    );
    const original = registry.get.bind(registry);
    const adapter: HermesMessagingAdapter = {
      channel: 'EMAIL',
      probe: async () => ({
        status: 'AVAILABLE',
        canSend: true,
        canSync: false,
      }),
      send: async (input) => {
        sends++;
        const claim = await getCoreRepository<HermesInboxMessageEntity>(
          HermesInboxMessageEntity,
        ).findOneByOrFail({
          workspaceId: input.workspaceId,
          clientRequestId: input.clientRequestId,
        });
        assert.equal(
          claim.status,
          'UNCONFIRMED',
          'Reservation must be durable before provider handoff',
        );
        if (uncertain)
          throw Object.assign(Error('Synthetic lost acknowledgement'), {
            code: 'DELIVERY_UNCERTAIN',
          });
        return {
          providerMessageId: `accepted-${input.clientRequestId}`,
          acceptedAt: new Date().toISOString(),
        };
      },
    };
    getAdapter = jest
      .spyOn(registry, 'get')
      .mockImplementation((channel) =>
        channel === 'EMAIL' ? adapter : original(channel),
      );
    a = await messageService().ingest(event(A));
    b = await messageService().ingest(event(B));
  }, 180_000);
  afterAll(async () => {
    getAdapter?.mockRestore();
    await getCoreRepository<HermesConversationEntity>(
      HermesConversationEntity,
    ).delete({ workspaceId: In([A, B]), providerConnectionId: connection });
    const orm = provider<WorkspaceOrmManager>('WorkspaceOrmManager');
    for (const [workspaceId, id] of people)
      await orm.executeInWorkspaceContext(async () => {
        await orm
          .getRepository(
            'person',
            { shouldBypassPermissionChecks: true },
            { shouldSkipEventEmission: true },
          )
          .delete({ id });
      }, buildSystemAuthContext(workspaceId));
    for (const membership of memberships)
      await provider<UserWorkspaceService>(
        'UserWorkspaceService',
      ).deleteUserWorkspace({
        workspaceId: membership.workspaceId,
        userWorkspaceId: membership.id,
      });
    for (const workspaceId of [A, B])
      await orm.executeInWorkspaceContext(async () => {
        if (users.length)
          await orm
            .getRepository(
              'workspaceMember',
              { shouldBypassPermissionChecks: true },
              { shouldSkipEventEmission: true },
            )
            .delete({ userId: In(users.map((user) => user.id)) });
      }, buildSystemAuthContext(workspaceId));
    if (users.length)
      await getCoreRepository<UserEntity>(UserEntity).delete({
        id: In(users.map((user) => user.id)),
      });
  }, 120_000);
  it('links same native email to distinct authorized Person records in A/B and exposes no foreign conversation', async () => {
    const listA = successful(await api(tokenA, LIST))
      .hermesInboxConversations as {
      items: { id: string; personId: string }[];
    };
    const listB = successful(await api(tokenB, LIST))
      .hermesInboxConversations as {
      items: { id: string; personId: string }[];
    };
    expect(
      listA.items.find((row) => row.id === a.conversationId)?.personId,
    ).toBe(people.get(A));
    expect(
      listB.items.find((row) => row.id === b.conversationId)?.personId,
    ).toBe(people.get(B));
    expect(listA.items.some((row) => row.id === b.conversationId)).toBe(false);
  });
  it('replays concurrent provider events exactly once in the real SQL ledger', async () => {
    const replays = await Promise.all(
      Array.from({ length: 8 }, () => messageService().ingest(event(A))),
    );
    expect(
      replays.every((row) => row.replay && row.messageId === a.messageId),
    ).toBe(true);
    expect(
      await getCoreRepository<HermesInboxMessageEntity>(
        HermesInboxMessageEntity,
      ).countBy({
        workspaceId: A,
        providerConnectionId: connection,
        providerMessageId: 'same-provider-message',
      }),
    ).toBe(1);
  });
  it('enforces the tenant-composite conversation FK in the actual database', async () => {
    let rejected = false;
    try {
      await provider<DataSource>('DataSource').query(
        `INSERT INTO core."hermesInboxMessage" ("id","workspaceId","conversationId","channel","providerConnectionId","providerMessageId","direction","status","text","contentDigest","occurredAt") VALUES ($1,$2,$3,'EMAIL',$4,'forged-fk','INBOUND','RECEIVED',$5,$6,$7)`,
        [
          randomUUID(),
          B,
          a.conversationId,
          connection,
          'Synthetic forged tenant',
          '0'.repeat(64),
          new Date().toISOString(),
        ],
      );
    } catch (error) {
      rejected = true;
      assert.equal(
        (error as { driverError?: { code?: string } }).driverError?.code,
        '23503',
      );
    }

    expect(rejected).toBe(true);
  });
  it('rejects anonymous and forged conversation reads/replies before provider I/O', async () => {
    expect((await api(undefined, LIST)).errors?.length).toBeGreaterThan(0);
    expect(
      (
        await api(tokenA, MESSAGES, {
          input: { conversationId: b.conversationId },
        })
      ).errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (
        await api(tokenA, REPLY, {
          input: {
            conversationId: b.conversationId,
            clientRequestId: randomUUID(),
            text: 'Forbidden',
          },
        })
      ).errors?.length,
    ).toBeGreaterThan(0);
    expect(sends).toBe(0);
  });
  it('persists a V3 local OFF policy through GraphQL, blocks stale updates and scopes access', async () => {
    const query =
      'query Policy($input:HermesConversationBotPolicyInput!){hermesConversationBotPolicy(input:$input){conversationId localMode effectiveMode reason revision canDraft canAutoReply}}';
    const mutation =
      'mutation Policy($input:HermesSetConversationBotPolicyInput!){hermesSetConversationBotPolicy(input:$input){conversationId localMode effectiveMode revision canDraft canAutoReply}}';
    const input = { conversationId: a.conversationId };
    const before = successful(await api(tokenA, query, { input }))
      .hermesConversationBotPolicy as { revision: string };
    const command = {
      ...input,
      mode: 'OFF',
      expectedRevision: before.revision,
    };
    const updated = successful(
      await api(tokenA, mutation, { input: command }),
    ).hermesSetConversationBotPolicy;
    expect(updated).toMatchObject({
      localMode: 'OFF',
      effectiveMode: 'OFF',
      canDraft: false,
      canAutoReply: false,
    });
    const stored = await getCoreRepository<HermesConversationEntity>(
      HermesConversationEntity,
    ).findOneByOrFail({ workspaceId: A, id: a.conversationId });
    expect(stored.botMode).toBe('OFF');
    expect(stored.botOwnerUserWorkspaceId).toBeNull();
    expect(
      successful(await api(tokenA, query, { input }))
        .hermesConversationBotPolicy,
    ).toMatchObject(updated as object);
    expect(
      (await api(tokenA, mutation, { input: command })).errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (await api(tokenB, query, { input })).errors?.length,
    ).toBeGreaterThan(0);
    expect(
      (await api(tokenB, mutation, { input: command })).errors?.length,
    ).toBeGreaterThan(0);
    const draft =
      'mutation Draft($input:HermesInboxDraftReplyInput!){hermesInboxDraftReply(input:$input){status text}}';
    expect(
      (
        await api(tokenA, draft, {
          input: { conversationId: a.conversationId, messageId: a.messageId },
        })
      ).errors?.length,
    ).toBeGreaterThan(0);
    expect(sends).toBe(0);
  });
  it('sends once for concurrent HTTP client requests and persists one visible accepted provider response', async () => {
    const input = {
      conversationId: a.conversationId,
      clientRequestId: randomUUID(),
      text: `${suffix} Reply`,
    };
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => api(tokenA, REPLY, { input })),
    );
    for (const response of responses) successful(response);
    expect(sends).toBe(1);
    const replay = successful(await api(tokenA, REPLY, { input }))
      .hermesInboxReply as { status: string };
    expect(replay.status).toBe('ACCEPTED');
    expect(sends).toBe(1);
    expect(
      await getCoreRepository<HermesInboxMessageEntity>(
        HermesInboxMessageEntity,
      ).countBy({
        workspaceId: A,
        conversationId: a.conversationId,
        direction: 'OUTBOUND',
        canonicalMessageId: IsNull(),
      }),
    ).toBe(1);
  });
  it('persists unconfirmed failure and never resends a replayed client command', async () => {
    uncertain = true;
    const input = {
      conversationId: a.conversationId,
      clientRequestId: randomUUID(),
      text: `${suffix} Uncertain`,
    };
    expect(
      (
        successful(await api(tokenA, REPLY, { input })).hermesInboxReply as {
          status: string;
        }
      ).status,
    ).toBe('UNCONFIRMED');
    expect(
      (
        successful(await api(tokenA, REPLY, { input })).hermesInboxReply as {
          status: string;
        }
      ).status,
    ).toBe('UNCONFIRMED');
    expect(sends).toBe(2);
    uncertain = false;
  });
  it('persists workspace/channel policy revisions in SQL without affecting workspace B', async () => {
    const query =
      'query { hermesWorkspaceBotPolicies { scope mode revision } }';
    const mutation =
      'mutation SetPolicy($input:HermesSetWorkspaceBotPolicyInput!){hermesSetWorkspaceBotPolicy(input:$input){scope mode revision}}';
    const beforeB = successful(
      await api(tokenB, query),
    ).hermesWorkspaceBotPolicies;
    const beforeA = successful(await api(tokenA, query))
      .hermesWorkspaceBotPolicies as {
      scope: string;
      mode: string;
      revision: string;
    }[];
    const repository = getCoreRepository<HermesBotPolicyEntity>(
      HermesBotPolicyEntity,
    );
    const previous = await repository.findOneBy({
      workspaceId: A,
      scope: 'EMAIL',
    });
    try {
      const input = {
        scope: 'EMAIL',
        mode: 'OFF',
        expectedRevision: beforeA.find((policy) => policy.scope === 'EMAIL')!
          .revision,
      };
      const updated = successful(
        await api(tokenA, mutation, { input }),
      ).hermesSetWorkspaceBotPolicy;
      expect(updated).toMatchObject({ scope: 'EMAIL', mode: 'OFF' });
      expect(
        await repository.findOneBy({ workspaceId: A, scope: 'EMAIL' }),
      ).toMatchObject({ mode: 'OFF' });
      expect(
        successful(await api(tokenB, query)).hermesWorkspaceBotPolicies,
      ).toEqual(beforeB);
      expect(
        (await api(tokenA, mutation, { input })).errors?.length,
      ).toBeGreaterThan(0);
      expect(sends).toBe(2);
    } finally {
      if (previous) await repository.save(previous);
      else await repository.delete({ workspaceId: A, scope: 'EMAIL' });
    }
  });
  it('refuses an existing session immediately after native membership revocation', async () => {
    const membership = memberships.find(
      (row) => row.workspaceId === A && row.userId === users[1].id,
    );
    assert.ok(membership);
    await provider<UserWorkspaceService>(
      'UserWorkspaceService',
    ).deleteUserWorkspace({
      workspaceId: A,
      userWorkspaceId: membership.id,
      softDelete: true,
    });
    expect((await api(revokedToken, LIST)).errors?.length).toBeGreaterThan(0);
  });
});
