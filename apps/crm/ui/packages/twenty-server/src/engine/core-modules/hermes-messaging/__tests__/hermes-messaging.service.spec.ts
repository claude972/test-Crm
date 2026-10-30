import { createServer } from 'node:http';
import { FindOperator, type DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import {
  type HermesMessagingEvent,
  type HermesMessagingActor,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class WorkspaceEntity {},
}));
jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class UserWorkspaceEntity {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service',
  () => ({ HermesMessagingAccessService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service',
  () => ({ HermesMessagingPersonService: class {} }),
);

const A = randomUUID(),
  B = randomUUID();
const actor: HermesMessagingActor = {
  workspaceId: A,
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const event: HermesMessagingEvent = {
  workspaceId: A,
  channel: 'WHATSAPP',
  direction: 'INBOUND',
  providerConnectionId: 'instance-a',
  providerConversationId: '596696123456@s.whatsapp.net',
  providerMessageId: 'remote-1',
  contactHandle: '596696123456@s.whatsapp.net',
  text: 'Bonjour',
  occurredAt: '2026-10-30T12:00:00.000Z',
};
type Row = Record<string, unknown>;
const matches = (row: Row, criteria: Row) =>
  Object.entries(criteria).every(([key, value]) =>
    value instanceof FindOperator && value.type === 'isNull'
      ? row[key] === null || row[key] === undefined
      : row[key] === value,
  );
const setup = (media?: Record<string, unknown>) => {
  const tables = new Map<string, Map<string, Row>>();
  let chain: Promise<unknown> = Promise.resolve();
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  const repository = (target: { name: string }) => {
    const rows = table(target.name);
    return {
      countBy: jest.fn(
        async (criteria: Row) =>
          [...rows.values()].filter((row) => matches(row, criteria)).length,
      ),
      findOne: jest.fn(async (options: { where: Row }) => {
        const found = [...rows.values()]
          .filter((row) => matches(row, options.where))
          .sort(
            (left, right) =>
              (right.occurredAt as Date).getTime() -
              (left.occurredAt as Date).getTime(),
          )[0];
        return found ? { ...found } : null;
      }),
      findOneBy: jest.fn(async (criteria: Row) => {
        const found = [...rows.values()].find((row) => matches(row, criteria));
        return found ? { ...found } : null;
      }),
      findOneByOrFail: jest.fn(async (criteria: Row) => {
        const row = [...rows.values()].find((row) => matches(row, criteria));
        if (!row) throw Error('Missing row');
        return { ...row };
      }),
      save: jest.fn(async (row: Row) => {
        const saved = { ...row };
        rows.set(
          row.id ? String(row.id) : `${row.workspaceId}:${row.scope}`,
          saved,
        );
        return saved;
      }),
      update: jest.fn(async (criteria: Row, update: Row) => {
        let affected = 0;
        for (const row of rows.values())
          if (matches(row, criteria)) {
            Object.assign(row, update);
            affected++;
          }
        return { affected };
      }),
      createQueryBuilder: () => {
        let params: Row = {},
          order: string[] = [];
        let limit = 100;
        let visible = false;
        const query = {
          where: (sql: string, values: Row) => {
            params = { ...params, ...values };
            visible = sql.includes('canonicalMessageId');
            return query;
          },
          andWhere: (_sql: string, values: Row) => {
            params = { ...params, ...values };
            return query;
          },
          orderBy: (field: string) => {
            order = [field.split('.')[1]];
            return query;
          },
          addOrderBy: (field: string) => {
            order.push(field.split('.')[1]);
            return query;
          },
          take: (value: number) => {
            limit = value;
            return query;
          },
          getMany: async () =>
            [...rows.values()]
              .filter(
                (row) =>
                  row.workspaceId === params.workspaceId &&
                  (!params.conversationId ||
                    row.conversationId === params.conversationId) &&
                  (!params.channel || row.channel === params.channel) &&
                  (!visible || !row.canonicalMessageId) &&
                  (!params.at ||
                    (row[order[0]] as Date).getTime() <
                      (params.at as Date).getTime() ||
                    ((row[order[0]] as Date).getTime() ===
                      (params.at as Date).getTime() &&
                      String(row.id) < String(params.id))),
              )
              .sort((left, right) => {
                for (const field of order) {
                  const a =
                    left[field] instanceof Date
                      ? (left[field] as Date).getTime()
                      : String(left[field]);
                  const b =
                    right[field] instanceof Date
                      ? (right[field] as Date).getTime()
                      : String(right[field]);
                  if (a < b) return 1;
                  if (a > b) return -1;
                }
                return 0;
              })
              .slice(0, limit),
        };
        return query;
      },
    };
  };
  const manager = {
    getRepository: repository,
    query: jest.fn().mockResolvedValue([]),
  };
  const dataSource = {
    getRepository: repository,
    transaction: <T>(
      work: (transactionManager: typeof manager) => Promise<T>,
    ) => {
      const next = chain.then(async () => {
        const snapshot = structuredClone(tables);
        try {
          return await work(manager);
        } catch (error) {
          tables.clear();
          for (const [key, rows] of snapshot) tables.set(key, rows);
          throw error;
        }
      });
      chain = next.catch(() => {});
      return next;
    },
  };
  for (const id of [A, B])
    table('WorkspaceEntity').set(id, {
      id,
      activationStatus: 'ACTIVE',
      deletedAt: null,
    });
  table('UserWorkspaceEntity').set(actor.userWorkspaceId, {
    id: actor.userWorkspaceId,
    workspaceId: A,
    userId: actor.userId,
    deletedAt: null,
  });
  table(HermesBotPolicyEntity.name).set(`${A}:WORKSPACE`, {
    workspaceId: A,
    scope: 'WORKSPACE',
    mode: 'AUTO',
    updatedAt: new Date('2026-10-30T00:00:00.000Z'),
    updatedByUserWorkspaceId: actor.userWorkspaceId,
  });
  let allowed = true;
  const access = {
    assertAllowed: jest.fn(async (candidate: HermesMessagingActor) => {
      if (
        !allowed ||
        candidate.userId !== actor.userId ||
        candidate.userWorkspaceId !== actor.userWorkspaceId ||
        candidate.workspaceId !== A
      )
        throw Error('ACCESS_DENIED');
    }),
  };
  const send = jest.fn(async () => ({
    providerMessageId: 'sent-1',
    acceptedAt: '2026-10-30T12:01:00.000Z',
  }));
  const registry = new HermesMessagingAdapterRegistry([
    { channel: 'WHATSAPP', probe: async () => ({ status: 'AVAILABLE' }), send },
  ]);
  const people = {
    match: jest.fn(async () => ({
      personId: null,
      personMatchStatus: 'UNMATCHED',
    })),
  };
  const service = new HermesMessagingService(
    dataSource as unknown as DataSource,
    access as never,
    registry,
    people as never,
    media as never,
  );
  return {
    service,
    tables,
    manager,
    dataSource,
    send,
    registry,
    access,
    people,
    table,
    revoke: () => {
      allowed = false;
    },
  };
};

describe('persistent messaging service contract', () => {
  const readyBot = () =>
    jest.fn().mockResolvedValue({
      mode: 'DRAFT',
      status: 'READY',
      provider: 'HERMES_MCP',
      text: 'Suggestion',
    });
  const setParent = async (
    service: HermesMessagingService,
    scope: 'WORKSPACE' | 'WHATSAPP' | 'EMAIL',
    mode: 'AUTO' | 'ASSISTED' | 'OFF',
  ) => {
    const policies = await service.workspaceBotPolicies(actor);
    return service.setWorkspaceBotPolicy(actor, {
      scope,
      mode,
      expectedRevision: policies.find((policy) => policy.scope === scope)!
        .revision,
    });
  };
  const setLocal = async (
    service: HermesMessagingService,
    conversationId: string,
    mode: 'INHERIT' | 'AUTO' | 'ASSISTED' | 'OFF',
    delegateAuto?: boolean,
  ) => {
    const policy = await service.conversationBotPolicy(actor, {
      conversationId,
    });
    return service.setConversationBotPolicy(actor, {
      conversationId,
      mode,
      expectedRevision: policy.revision,
      ...(delegateAuto === undefined ? {} : { delegateAuto }),
    });
  };

  it('defaults an unconfigured workspace to ASSISTED and never delegates AUTO implicitly', async () => {
    const { service, registry, table, send } = setup();
    table(HermesBotPolicyEntity.name).clear();
    registry.registerBot({ draftReply: readyBot() });
    const incoming = await service.ingest(event);
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({
      localMode: 'INHERIT',
      effectiveMode: 'ASSISTED',
      canDraft: true,
      canAutoReply: false,
    });
    await expect(
      setLocal(service, incoming.conversationId, 'AUTO', true),
    ).rejects.toThrow('BOT_POLICY_RESTRICTION');
    await expect(
      service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'AUTO',
      }),
    ).rejects.toThrow('BOT_POLICY_RESTRICTION');
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps MANUAL compatible with assisted drafts and never auto-sends in ASSISTED', async () => {
    const { service, registry, send, table } = setup();
    const draftReply = readyBot();
    registry.registerBot({ draftReply });
    const incoming = await service.ingest(event);
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'MANUAL',
    });
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({ localMode: 'ASSISTED', effectiveMode: 'ASSISTED' });
    expect(
      (
        await service.draftReply(actor, {
          conversationId: incoming.conversationId,
          messageId: incoming.messageId,
        })
      ).status,
    ).toBe('READY');
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botMode,
    ).toBe('MANUAL');
    await service.ingest({
      ...event,
      providerMessageId: 'assisted-new',
      occurredAt: new Date(Date.now() + 1).toISOString(),
    });
    expect(draftReply).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('OFF blocks all new MCP work but preserves a distinct human reply', async () => {
    const { service, registry, send } = setup();
    const draftReply = readyBot();
    registry.registerBot({ draftReply });
    const incoming = await service.ingest(event);
    expect(
      await setLocal(service, incoming.conversationId, 'OFF'),
    ).toMatchObject({
      effectiveMode: 'OFF',
      canDraft: false,
      canAutoReply: false,
    });
    await expect(
      service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).rejects.toThrow('BOT_POLICY_OFF');
    await service.ingest({ ...event, providerMessageId: 'off-new' });
    expect(draftReply).not.toHaveBeenCalled();
    await service.reply(actor, {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      text: 'Réponse humaine',
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('requires explicit delegation for INHERIT resolving to AUTO and never drafts backlog on activation', async () => {
    const { service, registry, send } = setup();
    const draftReply = readyBot();
    registry.registerBot({ draftReply });
    const incoming = await service.ingest(event);
    await expect(
      setLocal(service, incoming.conversationId, 'INHERIT'),
    ).rejects.toThrow('BOT_DELEGATION_REQUIRED');
    expect(
      await setLocal(service, incoming.conversationId, 'INHERIT', true),
    ).toMatchObject({ effectiveMode: 'AUTO', canAutoReply: true });
    expect(draftReply).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    await service.ingest({
      ...event,
      providerMessageId: 'delegated-new',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('restricts child policies and refuses stale concurrent local and global writes', async () => {
    const { service } = setup();
    const incoming = await service.ingest(event);
    const old = await service.conversationBotPolicy(actor, {
      conversationId: incoming.conversationId,
    });
    const policies = await service.workspaceBotPolicies(actor);
    await setParent(service, 'WORKSPACE', 'ASSISTED');
    await expect(
      service.setConversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
        mode: 'OFF',
        expectedRevision: old.revision,
      }),
    ).rejects.toThrow('BOT_POLICY_STALE');
    await expect(
      service.setWorkspaceBotPolicy(actor, {
        scope: 'WORKSPACE',
        mode: 'AUTO',
        expectedRevision: policies[0].revision,
      }),
    ).rejects.toThrow('BOT_POLICY_STALE');
    await expect(setParent(service, 'WHATSAPP', 'AUTO')).rejects.toThrow(
      'BOT_POLICY_RESTRICTION',
    );
    await expect(
      setLocal(service, incoming.conversationId, 'AUTO', true),
    ).rejects.toThrow('BOT_POLICY_RESTRICTION');
    await setParent(service, 'WHATSAPP', 'OFF');
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({ effectiveMode: 'OFF', reason: 'CHANNEL_POLICY' });
  });

  it('invalidates in-flight drafts on OFF and refuses their stale suggestion result', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    registry.registerBot({
      draftReply: async () => {
        enter();
        await gate;
        return {
          mode: 'DRAFT',
          status: 'READY',
          provider: 'HERMES_MCP',
          text: 'Late draft',
        };
      },
    });
    const pending = service.draftReply(actor, {
      conversationId: incoming.conversationId,
      messageId: incoming.messageId,
    });
    const rejected = expect(pending).rejects.toThrow('BOT_POLICY_STALE');
    await entered;
    await setLocal(service, incoming.conversationId, 'OFF');
    release();
    await rejected;
    expect(send).not.toHaveBeenCalled();
  });

  it('parent changes cancel an in-flight auto reply and relaxation does not resurrect the old grant', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const draftReply = jest.fn(async () => {
      enter();
      await gate;
      return {
        mode: 'DRAFT' as const,
        status: 'READY' as const,
        provider: 'HERMES_MCP' as const,
        text: 'Late auto',
      };
    });
    registry.registerBot({ draftReply });
    await setLocal(service, incoming.conversationId, 'AUTO', true);
    const processing = service.ingest({
      ...event,
      providerMessageId: 'parent-race',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    await entered;
    await setParent(service, 'WORKSPACE', 'OFF');
    await setParent(service, 'WORKSPACE', 'AUTO');
    release();
    await processing;
    await service.ingest({
      ...event,
      providerMessageId: 'after-relaxation',
      occurredAt: new Date(Date.now() + 20).toISOString(),
    });
    expect(send).not.toHaveBeenCalled();
    expect(draftReply).toHaveBeenCalledTimes(1);
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({ canAutoReply: false });
  });

  it('isolates policies and conversations from other workspaces and rechecks revoked readers', async () => {
    const { service, registry, table, revoke } = setup();
    registry.registerBot({ draftReply: readyBot() });
    const incoming = await service.ingest({ ...event, workspaceId: B });
    await expect(
      service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    await expect(
      setLocal(service, incoming.conversationId, 'OFF'),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    await setParent(service, 'WORKSPACE', 'OFF');
    expect(
      [...table(HermesBotPolicyEntity.name).values()].every(
        (row) => row.workspaceId === A,
      ),
    ).toBe(true);
    revoke();
    await expect(service.workspaceBotPolicies(actor)).rejects.toThrow(
      'ACCESS_DENIED',
    );
    await expect(setParent(service, 'WORKSPACE', 'AUTO')).rejects.toThrow(
      'ACCESS_DENIED',
    );
  });

  it('cannot use the legacy setter to lift local OFF or delegate a contact conflict', async () => {
    const { service, registry } = setup();
    registry.registerBot({ draftReply: readyBot() });
    const incoming = await service.ingest(event);
    await setLocal(service, incoming.conversationId, 'OFF');
    for (const mode of ['MANUAL', 'AUTO'] as const)
      await expect(
        service.setBotMode(actor, {
          conversationId: incoming.conversationId,
          mode,
        }),
      ).rejects.toThrow('BOT_POLICY_RESTRICTION');
    await setLocal(service, incoming.conversationId, 'ASSISTED');
    await service.ingest({
      ...event,
      providerMessageId: 'changed-contact',
      contactHandle: '596696654321@s.whatsapp.net',
    });
    await expect(
      setLocal(service, incoming.conversationId, 'AUTO', true),
    ).rejects.toThrow('CONVERSATION_CONTACT_REVIEW_REQUIRED');
  });
  it('fails closed on unknown stored policy values', async () => {
    const { service, registry, table } = setup();
    registry.registerBot({ draftReply: readyBot() });
    const incoming = await service.ingest(event);
    table(HermesBotPolicyEntity.name).get(`${A}:WORKSPACE`)!.mode = 'UNKNOWN';
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({
      effectiveMode: 'OFF',
      reason: 'BOT_POLICY_INVALID',
      canDraft: false,
      canAutoReply: false,
    });
    await expect(
      service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).rejects.toThrow('BOT_POLICY_OFF');
  });
  it('rejects legacy AUTO under parent OFF before probing the transport', async () => {
    const { service, registry } = setup();
    const incoming = await service.ingest(event);
    const probe = jest.fn().mockResolvedValue({ status: 'AVAILABLE' });
    registry.get('WHATSAPP')!.probe = probe;
    await setParent(service, 'WORKSPACE', 'OFF');
    await expect(
      service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'AUTO',
      }),
    ).rejects.toThrow('BOT_POLICY_RESTRICTION');
    expect(probe).not.toHaveBeenCalled();
  });
  it.each(['LOCAL', 'WORKSPACE', 'LEGACY'] as const)(
    'rechecks %s policy authorization after waiting for the serialized lock',
    async (scope) => {
      const { service, dataSource, access, revoke, table } = setup();
      const incoming = await service.ingest(event);
      const local = await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      });
      const policies = await service.workspaceBotPolicies(actor);
      let entered!: () => void, release!: () => void, queued!: () => void;
      const locked = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const queuedWrite = new Promise<void>((resolve) => {
        queued = resolve;
      });
      const blocker = dataSource.transaction(async () => {
        entered();
        await gate;
      });
      await locked;
      const transaction = dataSource.transaction.bind(dataSource);
      dataSource.transaction = (work) => {
        queued();
        return transaction(work);
      };
      const before = structuredClone([
        ...table(HermesBotPolicyEntity.name).entries(),
      ]);
      const pending =
        scope === 'LOCAL'
          ? service.setConversationBotPolicy(actor, {
              conversationId: incoming.conversationId,
              mode: 'OFF',
              expectedRevision: local.revision,
            })
          : scope === 'WORKSPACE'
            ? service.setWorkspaceBotPolicy(actor, {
                scope: 'WORKSPACE',
                mode: 'OFF',
                expectedRevision: policies[0].revision,
              })
            : service.setBotMode(actor, {
                conversationId: incoming.conversationId,
                mode: 'MANUAL',
              });
      const rejected = expect(pending).rejects.toThrow('ACCESS_DENIED');
      await queuedWrite;
      revoke();
      release();
      await blocker;
      await rejected;
      expect(
        (
          access.assertAllowed.mock.calls.at(-1) as unknown as [
            unknown,
            unknown,
          ]
        )?.[1],
      ).toHaveProperty('getRepository');
      expect([...table(HermesBotPolicyEntity.name).entries()]).toEqual(before);
      expect(
        table(HermesConversationEntity.name).get(incoming.conversationId)
          ?.botMode,
      ).toBe('INHERIT');
    },
  );

  it('does not restore a legacy delegation after OFF and AUTO parent changes during its probe', async () => {
    const { service, registry, table } = setup();
    const incoming = await service.ingest(event);
    registry.registerBot({ draftReply: readyBot() });
    let entered!: () => void, release!: () => void;
    const probing = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    registry.get('WHATSAPP')!.probe = async () => {
      entered();
      await gate;
      return { status: 'AVAILABLE' };
    };
    const pending = service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    const rejected = expect(pending).rejects.toThrow('BOT_HUMAN_HANDOFF');
    await probing;
    await setParent(service, 'WORKSPACE', 'OFF');
    await setParent(service, 'WORKSPACE', 'AUTO');
    release();
    await rejected;
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botOwnerUserWorkspaceId,
    ).toBeNull();
  });
  it('resets a channel to inherited policy with a durable revision, no implicit AUTO and no neighboring grant invalidation', async () => {
    const { service, registry, table, send } = setup();
    registry.registerBot({ draftReply: readyBot() });
    const incoming = await service.ingest(event);
    await setParent(service, 'WHATSAPP', 'AUTO');
    await setLocal(service, incoming.conversationId, 'AUTO', true);
    const neighborId = randomUUID();
    table(HermesConversationEntity.name).set(neighborId, {
      id: neighborId,
      workspaceId: A,
      channel: 'EMAIL',
      botMode: 'AUTO',
      botOwnerUserWorkspaceId: actor.userWorkspaceId,
      botModeUpdatedAt: new Date(),
    });
    const neighborBefore = await service.conversationBotPolicy(actor, {
      conversationId: neighborId,
    });
    const before = (await service.workspaceBotPolicies(actor)).find(
      (policy) => policy.scope === 'WHATSAPP',
    )!;
    const reset = await service.setWorkspaceBotPolicy(actor, {
      scope: 'WHATSAPP',
      mode: 'INHERIT',
      expectedRevision: before.revision,
    });
    expect(reset.mode).toBe('INHERIT');
    expect(reset.revision).not.toBe(before.revision);
    expect(table(HermesBotPolicyEntity.name).get(`${A}:WHATSAPP`)?.mode).toBe(
      'INHERIT',
    );
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botOwnerUserWorkspaceId,
    ).toBeNull();
    expect(
      table(HermesConversationEntity.name).get(neighborId)
        ?.botOwnerUserWorkspaceId,
    ).toBe(actor.userWorkspaceId);
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({ effectiveMode: 'AUTO', canAutoReply: false });
    await expect(
      service.setWorkspaceBotPolicy(actor, {
        scope: 'WHATSAPP',
        mode: 'OFF',
        expectedRevision: before.revision,
      }),
    ).rejects.toThrow('BOT_POLICY_STALE');
    await service.ingest({
      ...event,
      providerMessageId: 'reset-no-auto',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    expect(send).not.toHaveBeenCalled();
    const second = await service.setWorkspaceBotPolicy(actor, {
      scope: 'WHATSAPP',
      mode: 'INHERIT',
      expectedRevision: reset.revision,
    });
    expect(second.revision).not.toBe(reset.revision);
    await expect(
      service.setWorkspaceBotPolicy(actor, {
        scope: 'WHATSAPP',
        mode: 'OFF',
        expectedRevision: reset.revision,
      }),
    ).rejects.toThrow('BOT_POLICY_STALE');
    expect(
      (
        await service.conversationBotPolicy(actor, {
          conversationId: neighborId,
        })
      ).revision,
    ).toBe(neighborBefore.revision);
  });

  it('rejects workspace INHERIT and preserves restrictive workspace policy on channel reset', async () => {
    const { service } = setup();
    const incoming = await service.ingest(event);
    await setParent(service, 'WHATSAPP', 'OFF');
    await setParent(service, 'WORKSPACE', 'ASSISTED');
    const policies = await service.workspaceBotPolicies(actor);
    await expect(
      service.setWorkspaceBotPolicy(actor, {
        scope: 'WORKSPACE',
        mode: 'INHERIT',
        expectedRevision: policies[0].revision,
      }),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    const reset = await service.setWorkspaceBotPolicy(actor, {
      scope: 'WHATSAPP',
      mode: 'INHERIT',
      expectedRevision: policies.find((policy) => policy.scope === 'WHATSAPP')!
        .revision,
    });
    expect(reset.mode).toBe('INHERIT');
    expect(
      await service.conversationBotPolicy(actor, {
        conversationId: incoming.conversationId,
      }),
    ).toMatchObject({ effectiveMode: 'ASSISTED', canAutoReply: false });
  });

  it('replays the provider identity without duplication and rejects changed content', async () => {
    const { service, table } = setup();
    const first = await service.ingest(event);
    expect(
      (
        await service.ingest({
          ...event,
          occurredAt: '2026-10-30T12:00:01.000Z',
        })
      ).replay,
    ).toBe(true);
    expect(table(HermesInboxMessageEntity.name).size).toBe(1);
    await expect(
      service.ingest({ ...event, text: 'Different' }),
    ).rejects.toThrow('PROVIDER_EVENT_CONFLICT');
    expect(
      (await service.messages(actor, { conversationId: first.conversationId }))
        .items,
    ).toHaveLength(1);
  });
  it('scopes provider IDs to workspace AND connection and refuses forged conversations', async () => {
    const { service, send } = setup();
    const own = await service.ingest(event);
    const other = await service.ingest({ ...event, workspaceId: B });
    const otherConnection = await service.ingest({
      ...event,
      providerConnectionId: 'instance-b',
    });
    expect(
      new Set([own.messageId, other.messageId, otherConnection.messageId]).size,
    ).toBe(3);
    await expect(
      service.messages(actor, { conversationId: other.conversationId }),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    await expect(
      service.reply(actor, {
        conversationId: other.conversationId,
        clientRequestId: randomUUID(),
        text: 'No',
      }),
    ).rejects.toThrow('CONVERSATION_NOT_FOUND');
    expect(send).not.toHaveBeenCalled();
  });
  it('refuses disabled workspace ingress before storing provider data', async () => {
    const { service, table } = setup();
    table('WorkspaceEntity').get(A)!.activationStatus = 'SUSPENDED';
    await expect(service.ingest(event)).rejects.toThrow(
      'MESSAGING_WORKSPACE_UNAVAILABLE',
    );
    expect(table(HermesInboxMessageEntity.name).size).toBe(0);
  });
  it('performs fresh authorization before read, reply, and draft provider access', async () => {
    const { service, revoke, send, people } = setup();
    const incoming = await service.ingest(event);
    revoke();
    await expect(service.conversations(actor)).rejects.toThrow('ACCESS_DENIED');
    await expect(
      service.messages(actor, { conversationId: incoming.conversationId }),
    ).rejects.toThrow('ACCESS_DENIED');
    await expect(
      service.reply(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        text: 'Hello',
      }),
    ).rejects.toThrow('ACCESS_DENIED');
    await expect(
      service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).rejects.toThrow('ACCESS_DENIED');
    expect(send).not.toHaveBeenCalled();
    expect(people.match).not.toHaveBeenCalled();
  });
  it('reserves before transport, replays client requests and merges an early provider echo', async () => {
    const { service, send, table } = setup();
    const incoming = await service.ingest(event);
    send.mockImplementation(async () => {
      expect(
        [...table(HermesInboxMessageEntity.name).values()].filter(
          (row) => row.clientRequestId,
        )[0].status,
      ).toBe('UNCONFIRMED');
      await service.ingest({
        ...event,
        direction: 'OUTBOUND',
        providerMessageId: 'sent-1',
        text: 'Reply',
      });
      return {
        providerMessageId: 'sent-1',
        acceptedAt: '2026-10-30T12:01:00.000Z',
      };
    });
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      text: 'Reply',
    };
    const first = await service.reply(actor, input);
    const second = await service.reply(actor, input);
    expect(first.status).toBe('ACCEPTED');
    expect(second.id).toBe(first.id);
    expect(send).toHaveBeenCalledTimes(1);
    const page = await service.messages(actor, {
      conversationId: incoming.conversationId,
    });
    expect(page.items).toHaveLength(2);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: A,
        providerConnectionId: 'instance-a',
      }),
    );
  });
  it('does not resend after uncertain POST/timeout', async () => {
    const { service, send } = setup();
    const incoming = await service.ingest(event);
    send.mockRejectedValue(
      Object.assign(Error('private provider body must not leak'), {
        code: 'DELIVERY_UNCERTAIN',
      }),
    );
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      text: 'Reply',
    };
    expect((await service.reply(actor, input)).status).toBe('UNCONFIRMED');
    expect((await service.reply(actor, input)).errorCode).toBe(
      'DELIVERY_UNCERTAIN',
    );
    expect(send).toHaveBeenCalledTimes(1);
    await expect(
      service.reply(actor, { ...input, text: 'Changed' }),
    ).rejects.toThrow('CLIENT_REQUEST_CONFLICT');
  });
  it('rejects workspace arguments, blank text and invalid contacts rather than trusting caller scope', async () => {
    const { service, send } = setup();
    const incoming = await service.ingest(event);
    await expect(
      service.reply(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        text: 'hello',
        workspaceId: B,
      } as never),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    await expect(
      service.reply(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        text: '  ',
      }),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    await expect(
      service.ingest({
        ...event,
        channel: 'EMAIL',
        contactHandle: 'Name<a@example.com>',
      }),
    ).rejects.toThrow('INVALID_CONTACT_HANDLE');
    expect(send).not.toHaveBeenCalled();
  });
  it('does not claim a missing adapter is connected or a missing bot is ready', async () => {
    const { service, registry } = setup();
    const incoming = await service.ingest(event);
    const states = await service.connections(actor);
    expect(states.find((row) => row.channel === 'EMAIL')).toMatchObject({
      state: 'NOT_CONFIGURED',
      canSend: false,
      canSync: false,
    });
    expect(
      await service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).toMatchObject({ status: 'NOT_CONFIGURED', mode: 'MANUAL' });
    expect(() =>
      registry.register({
        channel: 'WHATSAPP',
        probe: async () => ({ status: 'AVAILABLE' }),
        send: async () => ({ providerMessageId: 'x', acceptedAt: '' }),
      }),
    ).toThrow('MESSAGING_ADAPTER_ALREADY_REGISTERED');
  });
  it('paginates equal timestamps with a tie-breaker and rejects malformed cursors', async () => {
    const { service } = setup();
    const incoming = await service.ingest(event);
    for (let index = 0; index < 4; index++)
      await service.ingest({
        ...event,
        providerMessageId: `remote-${index + 2}`,
      });
    const seen = new Set<string>();
    let cursor: string | undefined;
    do {
      const page = await service.messages(actor, {
        conversationId: incoming.conversationId,
        limit: 2,
        cursor,
      });
      for (const row of page.items) {
        expect(seen.has(row.id)).toBe(false);
        seen.add(row.id);
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.size).toBe(5);
    await expect(
      service.messages(actor, {
        conversationId: incoming.conversationId,
        cursor: 'not-a-cursor',
      }),
    ).rejects.toThrow('INVALID_CURSOR');
  });
  it('serializes concurrent requests and sends only after the durable claim', async () => {
    const { service, send } = setup();
    const incoming = await service.ingest(event);
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    send.mockImplementation(async () => {
      entered();
      await gate;
      return {
        providerMessageId: 'concurrent-send',
        acceptedAt: '2026-10-30T12:02:00.000Z',
      };
    });
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      text: 'Reply',
    };
    const first = service.reply(actor, input);
    await started;
    expect((await service.reply(actor, input)).status).toBe('UNCONFIRMED');
    release();
    expect((await first).status).toBe('ACCEPTED');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not send when the durable reservation cannot commit', async () => {
    const { service, send, dataSource } = setup();
    const incoming = await service.ingest(event);
    jest
      .spyOn(dataSource, 'transaction')
      .mockRejectedValueOnce(Error('Storage unavailable'));
    await expect(
      service.reply(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        text: 'Reply',
      }),
    ).rejects.toThrow('Storage unavailable');
    expect(send).not.toHaveBeenCalled();
  });
  it('does not send again if recording an actual provider acceptance fails', async () => {
    const { service, send, dataSource } = setup();
    const incoming = await service.ingest(event);
    send.mockImplementation(async () => {
      jest
        .spyOn(dataSource, 'transaction')
        .mockRejectedValueOnce(Error('Acceptance write failed'));
      return {
        providerMessageId: 'sent-1',
        acceptedAt: '2026-10-30T12:01:00.000Z',
      };
    });
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      text: 'Reply',
    };
    await expect(service.reply(actor, input)).rejects.toThrow(
      'Acceptance write failed',
    );
    expect((await service.reply(actor, input)).status).toBe('UNCONFIRMED');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('rechecks membership after provider/native reads before returning private results', async () => {
    const { service, people, revoke } = setup();
    await service.ingest(event);
    people.match.mockImplementation(async () => {
      revoke();
      return { personId: null, personMatchStatus: 'UNMATCHED' };
    });
    await expect(service.conversations(actor)).rejects.toThrow('ACCESS_DENIED');
  });
  it('keeps bot proposals manual and scoped to the stored message without dispatch', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    const draftReply = jest.fn().mockResolvedValue({
      mode: 'DRAFT',
      status: 'READY',
      text: 'Draft suggestion',
      provider: 'HERMES_MCP',
    });
    registry.registerBot({ draftReply });
    expect(
      await service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).toMatchObject({
      mode: 'DRAFT',
      status: 'READY',
      text: 'Draft suggestion',
    });
    expect(draftReply).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: A,
        text: 'Bonjour',
        messageId: incoming.messageId,
      }),
    );
    expect(send).not.toHaveBeenCalled();
    const foreign = await service.ingest({ ...event, workspaceId: B });
    await expect(
      service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: foreign.messageId,
      }),
    ).rejects.toThrow('MESSAGE_NOT_FOUND');
    expect(draftReply).toHaveBeenCalledTimes(1);
  });

  it('retains a received message when its provider thread changes contact, without silently retargeting CRM', async () => {
    const { service, people, registry } = setup();
    const incoming = await service.ingest(event);
    await service.ingest({
      ...event,
      providerMessageId: 'changed-contact',
      contactHandle: '596696999999@s.whatsapp.net',
      text: 'Do not lose this message',
    });
    const page = await service.messages(actor, {
      conversationId: incoming.conversationId,
    });
    expect(
      page.items.find((message) => message.text === 'Do not lose this message'),
    ).toMatchObject({
      status: 'RECEIVED',
      errorCode: 'CONTACT_HANDLE_CHANGED',
    });
    expect((await service.conversations(actor)).items[0]).toMatchObject({
      contactHandle: event.contactHandle,
      personId: null,
      personMatchStatus: 'AMBIGUOUS',
    });
    expect(people.match).not.toHaveBeenCalled();
    const draftReply = jest.fn().mockResolvedValue({
      mode: 'DRAFT',
      status: 'READY',
      provider: 'HERMES_MCP',
      text: 'Do not send',
    });
    registry.registerBot({ draftReply });
    expect(
      await service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'AUTO',
      }),
    ).toMatchObject({ mode: 'MANUAL', status: 'UNAVAILABLE' });
    expect(draftReply).not.toHaveBeenCalled();
  });

  it('rejects reusing a workspace client request ID on a different conversation', async () => {
    const { service, send } = setup();
    const first = await service.ingest(event);
    const other = await service.ingest({
      ...event,
      providerConnectionId: 'instance-b',
    });
    const clientRequestId = randomUUID();
    await service.reply(actor, {
      conversationId: first.conversationId,
      clientRequestId,
      text: 'Reply',
    });
    await expect(
      service.reply(actor, {
        conversationId: other.conversationId,
        clientRequestId,
        text: 'Reply',
      }),
    ).rejects.toThrow('CLIENT_REQUEST_CONFLICT');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not acquire separate authorization connections while holding the serialized database transaction', async () => {
    const { service, dataSource, access } = setup();
    const incoming = await service.ingest(event);
    let insideTransaction = false;
    const original = dataSource.transaction.bind(dataSource);
    jest.spyOn(dataSource, 'transaction').mockImplementation((work) =>
      original(async (manager) => {
        insideTransaction = true;
        try {
          return await work(manager);
        } finally {
          insideTransaction = false;
        }
      }),
    );
    access.assertAllowed.mockImplementation(async () => {
      if (insideTransaction) throw Error('Authorization pool starvation');
    });
    expect(
      (
        await service.reply(actor, {
          conversationId: incoming.conversationId,
          clientRequestId: randomUUID(),
          text: 'Reply',
        })
      ).status,
    ).toBe('ACCEPTED');
  });

  it('keeps default inherited assistance and refuses AUTO when MCP is not configured', async () => {
    const { service, table, send } = setup();
    const incoming = await service.ingest(event);
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botMode,
    ).toBe('INHERIT');
    expect(
      await service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'AUTO',
      }),
    ).toMatchObject({ mode: 'MANUAL', status: 'NOT_CONFIGURED' });
    expect(send).not.toHaveBeenCalled();
  });
  it('auto-replies once only to a future inbound event under the live operator grant', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    registry.registerBot({
      draftReply: async () => ({
        mode: 'DRAFT',
        status: 'READY',
        provider: 'HERMES_MCP',
        text: 'Bot response',
      }),
    });
    expect(
      (
        await service.setBotMode(actor, {
          conversationId: incoming.conversationId,
          mode: 'AUTO',
        })
      ).mode,
    ).toBe('AUTO');
    expect(send).not.toHaveBeenCalled();
    const future = {
      ...event,
      providerMessageId: 'future-auto',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    };
    await Promise.all([service.ingest(future), service.ingest(future)]);
    expect(send).toHaveBeenCalledTimes(1);
    await service.ingest(future);
    expect(send).toHaveBeenCalledTimes(1);
    await service.ingest({ ...event, providerMessageId: 'old-history' });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('honors human handoff while an MCP response is in flight', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    registry.registerBot({
      draftReply: async () => {
        if (++calls >= 1) {
          started();
          await gate;
        }
        return {
          mode: 'DRAFT',
          status: 'READY',
          provider: 'HERMES_MCP',
          text: 'Delayed draft',
        };
      },
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    const processing = service.ingest({
      ...event,
      providerMessageId: 'pending-draft',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    await entered;
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'MANUAL',
    });
    release();
    await processing;
    expect(send).not.toHaveBeenCalled();
  });
  it('refuses a revoked operator and disables AUTO without provider dispatch', async () => {
    const { service, registry, revoke, send, table } = setup();
    const incoming = await service.ingest(event);
    registry.registerBot({
      draftReply: async () => ({
        mode: 'DRAFT',
        status: 'READY',
        provider: 'HERMES_MCP',
        text: 'Bot response',
      }),
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    revoke();
    await service.ingest({
      ...event,
      providerMessageId: 'after-revoke',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    expect(send).not.toHaveBeenCalled();
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botMode,
    ).toBe('MANUAL');
  });
  it('leaves AUTO unavailable and switches to manual if configured MCP stops responding', async () => {
    const { service, registry, send, table } = setup();
    const incoming = await service.ingest(event);
    let configured = true;
    registry.registerBot({
      draftReply: async () =>
        configured
          ? {
              mode: 'DRAFT',
              status: 'READY',
              provider: 'HERMES_MCP',
              text: 'Ready',
            }
          : {
              mode: 'MANUAL',
              status: 'NOT_CONFIGURED',
              provider: 'HERMES_MCP',
            },
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    configured = false;
    await service.ingest({
      ...event,
      providerMessageId: 'configuration-removed',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    expect(send).not.toHaveBeenCalled();
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botMode,
    ).toBe('MANUAL');
  });

  it('invalidates an old draft across manual takeover and re-enable by the same operator', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    registry.registerBot({
      draftReply: async () => {
        if (++calls === 1) {
          started();
          await gate;
        }
        return {
          mode: 'DRAFT',
          status: 'READY',
          provider: 'HERMES_MCP',
          text: 'Draft',
        };
      },
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    const processing = service.ingest({
      ...event,
      providerMessageId: 'old-inflight',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    await entered;
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'MANUAL',
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    release();
    await processing;
    expect(send).not.toHaveBeenCalled();
  });
  it('rechecks the grant after a slow provider probe and before any POST', async () => {
    const { service, registry, send } = setup();
    const incoming = await service.ingest(event);
    registry.registerBot({
      draftReply: async () => ({
        mode: 'DRAFT',
        status: 'READY',
        provider: 'HERMES_MCP',
        text: 'Draft',
      }),
    });
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'AUTO',
    });
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    registry.get('WHATSAPP')!.probe = async () => {
      started();
      await gate;
      return { status: 'AVAILABLE' };
    };
    const processing = service.ingest({
      ...event,
      providerMessageId: 'probe-pending',
      occurredAt: new Date(Date.now() + 10).toISOString(),
    });
    await entered;
    await service.setBotMode(actor, {
      conversationId: incoming.conversationId,
      mode: 'MANUAL',
    });
    release();
    await processing;
    expect(send).not.toHaveBeenCalled();
  });
  it('honors handoff before an actual loopback HTTP proposal response and performs no provider POST', async () => {
    const { service, registry } = setup();
    const incoming = await service.ingest(event);
    let proposed = 0,
      posted = 0,
      entered!: () => void,
      release!: () => void;
    const pending = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const server = createServer(async (request, response) => {
      if (request.url === '/draft') {
        if (++proposed === 1) {
          entered();
          await gate;
        }
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({
            mode: 'DRAFT',
            status: 'READY',
            provider: 'HERMES_MCP',
            text: 'Loopback proposal',
          }),
        );
      } else {
        posted++;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({
            providerMessageId: 'loopback-only',
            acceptedAt: new Date().toISOString(),
          }),
        );
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw Error('Fixture bind failed');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      registry.registerBot({
        draftReply: async (input) =>
          (
            await fetch(`${origin}/draft`, {
              method: 'POST',
              body: JSON.stringify(input),
            })
          ).json(),
      });
      registry.get('WHATSAPP')!.send = async (input) =>
        (
          await fetch(`${origin}/send`, {
            method: 'POST',
            body: JSON.stringify(input),
          })
        ).json();
      await service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'AUTO',
      });
      const processing = service.ingest({
        ...event,
        providerMessageId: 'http-handoff',
        occurredAt: new Date(Date.now() + 10).toISOString(),
      });
      await pending;
      await service.setBotMode(actor, {
        conversationId: incoming.conversationId,
        mode: 'MANUAL',
      });
      release();
      await processing;
      expect(proposed).toBe(1);
      expect(posted).toBe(0);
    } finally {
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('persists bounded private provider metadata without using it as an authorization or direction grant', async () => {
    const { service, table } = setup();
    const received = await service.ingest({
      ...event,
      providerMetadata: {
        rfcMessageId: '<header@example.test>',
        inReplyTo: '<parent@example.test>',
        references: ['<parent@example.test>'],
        mailbox: 'INBOX',
        uidValidity: 123,
        uid: 45,
      },
    });
    expect(
      table(HermesInboxMessageEntity.name).get(received.messageId)
        ?.providerMetadata,
    ).toMatchObject({
      rfcMessageId: '<header@example.test>',
      uidValidity: '123',
      uid: 45,
    });
    expect(
      table(HermesInboxMessageEntity.name).get(received.messageId)?.status,
    ).toBe('RECEIVED');
  });
  it('rejects metadata privilege keys, header injection and oversized reference lists', async () => {
    const { service } = setup();
    for (const providerMetadata of [
      { workspaceId: B },
      { rfcMessageId: 'x\r\nBcc: private@example.test' },
      { rfcMessageId: 'x'.repeat(999) },
      { references: Array.from({ length: 21 }, () => '<x>') },
      { references: Array.from({ length: 20 }, () => 'x'.repeat(998)) },
      { uid: 0 },
    ])
      await expect(
        service.ingest({ ...event, providerMetadata } as never),
      ).rejects.toThrow('INVALID_MESSAGING_INPUT');
  });
});

describe('V3 media durable ledger preserves human policy and uncertainty rules', () => {
  const assetId = randomUUID();
  const make = () => {
    const media = {
      bind: jest.fn(async () => ({ kind: 'IMAGE', size: 7 })),
      bytes: jest.fn(async () => ({
        bytes: Buffer.from('fixture'),
        asset: {
          id: assetId,
          kind: 'IMAGE',
          mimeType: 'image/png',
          filename: 'fixture.png',
        },
      })),
      digest: jest.fn(async () => 'b'.repeat(64)),
      attachment: jest.fn(async () => [
        {
          id: assetId,
          kind: 'IMAGE',
          mimeType: 'image/png',
          filename: 'fixture.png',
          size: 7,
          status: 'ATTACHED',
        },
      ]),
    };
    const h = setup(media);
    h.registry.get('WHATSAPP')!.probe = async () => ({
      status: 'AVAILABLE',
      canSendMedia: true,
    });
    return { ...h, media };
  };
  it('allows an authorized human media reply under OFF, reserves before bytes/network and replays without re-sending', async () => {
    const h = make();
    const incoming = await h.service.ingest(event);
    const policy = await h.service.conversationBotPolicy(actor, {
      conversationId: incoming.conversationId,
    });
    await h.service.setConversationBotPolicy(actor, {
      conversationId: incoming.conversationId,
      mode: 'OFF',
      expectedRevision: policy.revision,
    });
    const clientRequestId = randomUUID();
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId,
      kind: 'IMAGE' as const,
      text: 'Human caption',
      assetId,
    };
    h.media.bytes.mockImplementationOnce(async () => {
      const reservation = [
        ...h.table(HermesInboxMessageEntity.name).values(),
      ].find((message) => message.clientRequestId === clientRequestId);
      expect(reservation).toMatchObject({
        status: 'UNCONFIRMED',
        errorCode: 'DELIVERY_UNCERTAIN',
        attachmentIds: [assetId],
      });
      return {
        bytes: Buffer.from('fixture'),
        asset: {
          id: assetId,
          kind: 'IMAGE',
          mimeType: 'image/png',
          filename: 'fixture.png',
        },
      };
    });
    const result = await h.service.replyV3(actor, input);
    expect(result).toMatchObject({
      kind: 'IMAGE',
      status: 'ACCEPTED',
      text: 'Human caption',
      attachments: [{ id: assetId }],
    });
    const replay = await h.service.replyV3(actor, input);
    expect(replay.id).toBe(result.id);
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.media.bind).toHaveBeenCalledTimes(1);
    expect(h.media.bytes).toHaveBeenCalledTimes(1);
    expect(h.send).toHaveBeenCalledWith(
      expect.objectContaining({
        media: expect.objectContaining({
          kind: 'IMAGE',
          bytes: Buffer.from('fixture'),
        }),
      }),
    );
    await expect(
      h.service.replyV3(actor, { ...input, assetId: randomUUID() }),
    ).rejects.toThrow('CLIENT_REQUEST_CONFLICT');
  });
  it('keeps uncertain media sends durable and never re-emits on the same client request', async () => {
    const h = make();
    const incoming = await h.service.ingest(event);
    h.send.mockRejectedValueOnce(
      Object.assign(Error('provider private detail'), {
        code: 'DELIVERY_UNCERTAIN',
      }),
    );
    const input = {
      conversationId: incoming.conversationId,
      clientRequestId: randomUUID(),
      kind: 'IMAGE' as const,
      text: '',
      assetId,
    };
    const first = await h.service.replyV3(actor, input),
      second = await h.service.replyV3(actor, input);
    expect(first).toMatchObject({
      status: 'UNCONFIRMED',
      errorCode: 'DELIVERY_UNCERTAIN',
    });
    expect(second.id).toBe(first.id);
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.media.bind).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(first)).not.toContain('provider private detail');
  });
  it('refuses unverified provider media capability before consuming an asset or reserving a message', async () => {
    const h = make();
    const incoming = await h.service.ingest(event);
    h.registry.get('WHATSAPP')!.probe = async () => ({
      status: 'AVAILABLE',
      canSendMedia: false,
    });
    await expect(
      h.service.replyV3(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        kind: 'IMAGE',
        text: '',
        assetId,
      }),
    ).rejects.toThrow('MEDIA_PROVIDER_NOT_VERIFIED');
    expect(h.media.bind).not.toHaveBeenCalled();
    expect(h.media.bytes).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });
  it('never assumes MCP can understand inbound image or voice content', async () => {
    const h = make();
    const bot = {
      draftReply: jest.fn(async () => ({
        mode: 'DRAFT' as const,
        status: 'READY' as const,
        provider: 'HERMES_MCP' as const,
        text: 'not allowed',
      })),
    };
    h.registry.registerBot(bot);
    const incoming = await h.service.ingest({
      ...event,
      kind: 'IMAGE',
      mediaAssetId: assetId,
      text: '',
    });
    expect(bot.draftReply).not.toHaveBeenCalled();
    await expect(
      h.service.draftReply(actor, {
        conversationId: incoming.conversationId,
        messageId: incoming.messageId,
      }),
    ).rejects.toThrow('MEDIA_MCP_ANALYSIS_UNSUPPORTED');
    expect(bot.draftReply).not.toHaveBeenCalled();
  });
  it('cannot send a cancelled/revoked asset or ignore incompatible text/audio semantics', async () => {
    const h = make();
    const incoming = await h.service.ingest(event);
    h.media.bind.mockRejectedValueOnce(Error('MEDIA_ASSET_NOT_FOUND'));
    await expect(
      h.service.replyV3(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        kind: 'IMAGE',
        text: '',
        assetId,
      }),
    ).rejects.toThrow('MEDIA_ASSET_NOT_FOUND');
    await expect(
      h.service.replyV3(actor, {
        conversationId: incoming.conversationId,
        clientRequestId: randomUUID(),
        kind: 'AUDIO',
        text: 'unrepresentable caption',
        assetId,
      }),
    ).rejects.toThrow('AUDIO_CAPTION_UNSUPPORTED');
    expect(h.send).not.toHaveBeenCalled();
    expect(h.media.bytes).not.toHaveBeenCalled();
  });
});

describe('Email rich content uses the same durable core send boundary', () => {
  const ids = [randomUUID(), randomUUID()];
  const envelope = {
    from: 'sender@example.test',
    to: ['recipient@example.test'],
    cc: [],
    bcc: ['hidden@example.test'],
    subject: 'Real typed contract',
    text: 'Body',
    html: '<p>Body</p>',
    inlineAttachments: [{ assetId: ids[0], cid: 'fixture-image' }],
  };
  const make = () => {
    const media = {
      bind: jest.fn(async () => ({ kind: 'FILE', size: 7 })),
      bytes: jest.fn(async () => ({
        bytes: Buffer.from('fixture'),
        asset: {
          kind: 'FILE',
          mimeType: 'application/pdf',
          filename: 'fixture.pdf',
        },
      })),
      digest: jest.fn(async () => 'b'.repeat(64)),
      attachment: jest.fn(async (_workspace: string, id: string) => [
        {
          id,
          kind: 'FILE',
          mimeType: 'application/pdf',
          filename: 'fixture.pdf',
          size: 7,
          status: 'ATTACHED',
        },
      ]),
    };
    const h = setup(media);
    const send = jest.fn(async () => ({
      providerMessageId: 'email-provider-accepted',
      acceptedAt: '2026-10-30T12:01:00.000Z',
    }));
    h.registry.register({
      channel: 'EMAIL',
      probe: async () => ({
        status: 'AVAILABLE',
        canSend: true,
        canComposeRichEmail: true,
      }),
      send,
    });
    return { ...h, media, emailSend: send };
  };
  const incoming = {
    ...event,
    channel: 'EMAIL' as const,
    contactHandle: 'contact@example.test',
    kind: 'EMAIL' as const,
  };
  it('binds all attachments before SMTP, keeps the envelope private and detects changed Bcc on replay', async () => {
    const h = make(),
      message = await h.service.ingest(incoming);
    const input = {
      conversationId: message.conversationId,
      clientRequestId: randomUUID(),
      envelope,
      attachmentIds: ids,
    };
    const result = await h.service.replyEmail(actor, input);
    expect(h.media.bind).toHaveBeenCalledTimes(2);
    expect(h.emailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        email: envelope,
        attachments: [
          {
            assetId: ids[0],
            kind: 'FILE',
            mimeType: 'application/pdf',
            filename: 'fixture.pdf',
            bytes: Buffer.from('fixture'),
          },
          {
            assetId: ids[1],
            kind: 'FILE',
            mimeType: 'application/pdf',
            filename: 'fixture.pdf',
            bytes: Buffer.from('fixture'),
          },
        ],
      }),
    );
    expect(result.attachments).toHaveLength(2);
    expect(result.kind).toBe('EMAIL');
    expect(result.status).toBe('ACCEPTED');
    expect(JSON.stringify(result)).not.toContain('hidden@example.test');
    expect(JSON.stringify(result)).not.toContain('<p>Body</p>');
    expect((await h.service.replyEmail(actor, input)).id).toBe(result.id);
    await expect(
      h.service.replyEmail(actor, {
        ...input,
        envelope: { ...envelope, bcc: ['changed@example.test'] },
      }),
    ).rejects.toThrow('CLIENT_REQUEST_CONFLICT');
    expect(h.emailSend).toHaveBeenCalledTimes(1);
  });
  it('rolls back the whole reservation when any attachment is revoked or from another scope', async () => {
    const h = make(),
      message = await h.service.ingest(incoming);
    h.table('AssetFixture').set(ids[0], { id: ids[0], status: 'READY' });
    h.media.bind
      .mockImplementationOnce(async () => {
        h.table('AssetFixture').get(ids[0])!.status = 'ATTACHED';
        return { kind: 'FILE', size: 7 };
      })
      .mockRejectedValueOnce(Error('MEDIA_ASSET_NOT_FOUND'));
    await expect(
      h.service.replyEmail(actor, {
        conversationId: message.conversationId,
        clientRequestId: randomUUID(),
        envelope,
        attachmentIds: ids,
      }),
    ).rejects.toThrow('MEDIA_ASSET_NOT_FOUND');
    expect(h.table('AssetFixture').get(ids[0])!.status).toBe('READY');
    expect(
      [...h.table(HermesInboxMessageEntity.name).values()].filter(
        (row) => row.direction === 'OUTBOUND',
      ),
    ).toHaveLength(0);
    expect(h.emailSend).not.toHaveBeenCalled();
    expect(h.media.bytes).not.toHaveBeenCalled();
  });
  it('rejects duplicate asset IDs, injected headers and invalid/out-of-scope inline CID references', async () => {
    const h = make(),
      message = await h.service.ingest(incoming);
    const input = {
      conversationId: message.conversationId,
      clientRequestId: randomUUID(),
      envelope,
      attachmentIds: ids,
    };
    await expect(
      h.service.replyEmail(actor, {
        ...input,
        attachmentIds: [ids[0], ids[0]],
      }),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    await expect(
      h.service.replyEmail(actor, {
        ...input,
        envelope: { ...envelope, subject: 'x\r\nBcc: leak@example.test' },
      }),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    await expect(
      h.service.replyEmail(actor, {
        ...input,
        envelope: {
          ...envelope,
          inlineAttachments: [{ assetId: randomUUID(), cid: 'outside' }],
        },
      }),
    ).rejects.toThrow('EMAIL_INLINE_ATTACHMENT_SCOPE_INVALID');
    await expect(
      h.service.replyEmail(actor, {
        ...input,
        envelope: {
          ...envelope,
          inlineAttachments: [
            { assetId: ids[0], cid: 'https://external.example.test' },
          ],
        },
      }),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
    expect(h.media.bind).not.toHaveBeenCalled();
    expect(h.emailSend).not.toHaveBeenCalled();
  });
  it('refuses more than25MiB before bytes/network and never changes a WhatsApp thread into an email send', async () => {
    const h = make(),
      message = await h.service.ingest(incoming);
    h.media.bind.mockResolvedValue({ kind: 'FILE', size: 20 * 1024 * 1024 });
    await expect(
      h.service.replyEmail(actor, {
        conversationId: message.conversationId,
        clientRequestId: randomUUID(),
        envelope,
        attachmentIds: ids,
      }),
    ).rejects.toThrow('MEDIA_TOTAL_SIZE_EXCEEDED');
    const wa = await h.service.ingest(event);
    await expect(
      h.service.replyEmail(actor, {
        conversationId: wa.conversationId,
        clientRequestId: randomUUID(),
        envelope: { ...envelope, inlineAttachments: [] },
        attachmentIds: [],
      }),
    ).rejects.toThrow('EMAIL_CHANNEL_REQUIRED');
    expect(h.emailSend).not.toHaveBeenCalled();
    expect(h.media.bytes).not.toHaveBeenCalled();
  });
});

describe('Provider history cannot move the conversation activity backwards', () => {
  it('preserves MAX(existing,event.occurredAt) for old imports, provider echoes and accepted replies', async () => {
    const h = setup();
    const latest = await h.service.ingest({
      ...event,
      providerMessageId: 'history-newer',
      occurredAt: '2026-10-30T12:05:00.000Z',
    });
    await h.service.ingest({
      ...event,
      providerMessageId: 'history-older',
      occurredAt: '2026-10-29T12:00:00.000Z',
    });
    expect(
      h.table(HermesConversationEntity.name).get(latest.conversationId)
        ?.lastMessageAt,
    ).toEqual(new Date('2026-10-30T12:05:00.000Z'));
    await h.service.ingest({
      ...event,
      direction: 'OUTBOUND',
      providerMessageId: 'old-provider-echo',
      occurredAt: '2026-10-29T13:00:00.000Z',
    });
    expect(
      h.table(HermesConversationEntity.name).get(latest.conversationId)
        ?.lastMessageAt,
    ).toEqual(new Date('2026-10-30T12:05:00.000Z'));
    const beforeReply = new Date();
    await h.service.reply(actor, {
      conversationId: latest.conversationId,
      clientRequestId: randomUUID(),
      text: 'Human reply with an older provider acceptance timestamp',
    });
    expect(
      (
        h.table(HermesConversationEntity.name).get(latest.conversationId)
          ?.lastMessageAt as Date
      ).getTime(),
    ).toBeGreaterThanOrEqual(
      Math.max(
        beforeReply.getTime(),
        new Date('2026-10-30T12:05:00.000Z').getTime(),
      ),
    );
  });
});

describe('Mail hydration is observation, never an automatic sending trigger', () => {
  it('suppresses MCP/AUTO during backfill and never turns a Sent observation into acceptance evidence', async () => {
    const h = setup();
    h.registry.register({
      channel: 'EMAIL',
      probe: async () => ({ status: 'AVAILABLE' }),
      send: h.send,
    });
    const initial = {
      ...event,
      channel: 'EMAIL' as const,
      kind: 'EMAIL' as const,
      contactHandle: 'contact@example.test',
    };
    const conversation = await h.service.ingest(initial, {
      suppressAutomation: true,
      observedOnly: true,
    });
    await h.service.setBotMode(actor, {
      conversationId: conversation.conversationId,
      mode: 'AUTO',
    });
    const bot = {
      draftReply: jest.fn(async () => ({
        mode: 'DRAFT' as const,
        status: 'READY' as const,
        provider: 'HERMES_MCP' as const,
        text: 'Must not send from history',
      })),
    };
    h.registry.registerBot(bot);
    const observed = await h.service.ingest(
      { ...initial, providerMessageId: 'old-mail-backfill' },
      { suppressAutomation: true, observedOnly: true },
    );
    expect(
      h.table(HermesInboxMessageEntity.name).get(observed.messageId)?.status,
    ).toBe('OBSERVED');
    const sent = {
      ...initial,
      providerMessageId: 'sent-folder-observed',
      direction: 'OUTBOUND' as const,
    };
    const first = await h.service.ingest(sent, {
      suppressAutomation: true,
      observedOnly: true,
    });
    expect(
      h.table(HermesInboxMessageEntity.name).get(first.messageId)?.status,
    ).toBe('OBSERVED');
    expect(bot.draftReply).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
    await h.service.ingest(sent);
    expect(
      h.table(HermesInboxMessageEntity.name).get(first.messageId)?.status,
    ).toBe('ACCEPTED');
    await h.service.ingest(sent, {
      suppressAutomation: true,
      observedOnly: true,
    });
    expect(
      h.table(HermesInboxMessageEntity.name).get(first.messageId)?.status,
    ).toBe('ACCEPTED');
    await expect(
      h.service.ingest({ ...initial, suppressAutomation: true } as never),
    ).rejects.toThrow('INVALID_MESSAGING_INPUT');
  });
});

describe('New mail drafts have a real scoped conversation without a fabricated message', () => {
  it('creates a deterministic MANUAL conversation and reuses it without messages or network sends', async () => {
    const h = setup();
    h.registry.register({
      channel: 'EMAIL',
      probe: async () => ({ status: 'AVAILABLE' }),
      send: h.send,
    });
    const input = {
      clientRequestId: randomUUID(),
      providerConnectionId: 'fixture-verified-mailbox',
      contactHandle: 'recipient@example.test',
      subject: 'Draft subject',
    };
    const first = await h.service.ensureEmailDraftConversation(actor, input);
    const second = await h.service.ensureEmailDraftConversation(actor, input);
    expect(first.id).toBe(second.id);
    expect(first.botMode).toBe('MANUAL');
    expect(first.providerConversationId).toBe(`draft:${input.clientRequestId}`);
    expect(h.table(HermesInboxMessageEntity.name).size).toBe(0);
    expect(h.send).not.toHaveBeenCalled();
    await expect(
      h.service.ensureEmailDraftConversation(actor, {
        ...input,
        contactHandle: 'different@example.test',
      }),
    ).rejects.toThrow('DRAFT_CONVERSATION_CONFLICT');
    h.revoke();
    await expect(
      h.service.ensureEmailDraftConversation(actor, input),
    ).rejects.toThrow('ACCESS_DENIED');
  });
});

describe('server-only ingress snapshot boundary', () => {
  it('rechecks the trusted connection snapshot after the advisory lock before any ledger write', async () => {
    const h = setup();
    let live = true;
    let release: () => void = () => {},
      start: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
        release = resolve;
      }),
      started = new Promise<void>((resolve) => {
        start = resolve;
      });
    h.manager.query.mockImplementation(async () => {
      start();
      await gate;
      return [];
    });
    const assertLive = jest.fn(async (manager?: unknown) => {
      expect(manager).toBe(h.manager);
      if (!live) throw new Error('CONNECTION_REVOKED');
    });
    const pending = h.service.ingest(event, {
      suppressAutomation: true,
      assertLive,
    });
    const rejected = expect(pending).rejects.toThrow('CONNECTION_REVOKED');
    await Promise.race([
      started,
      rejected.then(() => {
        throw new Error('NO_LOCK_GATE');
      }),
    ]);
    live = false;
    release();
    await rejected;
    expect(h.table(HermesConversationEntity.name).size).toBe(0);
    expect(h.table(HermesInboxMessageEntity.name).size).toBe(0);
    expect(h.send).not.toHaveBeenCalled();
    expect(assertLive).toHaveBeenCalledWith(h.manager);
  });
  it('rolls back a message when the snapshot is revoked while the final insert was awaited', async () => {
    const h = setup();
    let live = true;
    const repository = h.manager.getRepository;
    h.manager.getRepository = (target) => {
      const result = repository(target);
      if (target === HermesInboxMessageEntity) {
        const save = result.save;
        result.save = jest.fn(async (row) => {
          const saved = await save(row);
          live = false;
          return saved;
        });
      }
      return result;
    };
    const assertLive = jest.fn(async (manager?: unknown) => {
      expect(manager).toBe(h.manager);
      if (!live) throw new Error('CONNECTION_REVOKED');
    });
    await expect(
      h.service.ingest(event, { suppressAutomation: true, assertLive }),
    ).rejects.toThrow('CONNECTION_REVOKED');
    expect(h.table(HermesConversationEntity.name).size).toBe(0);
    expect(h.table(HermesInboxMessageEntity.name).size).toBe(0);
    expect(h.send).not.toHaveBeenCalled();
  });
});
