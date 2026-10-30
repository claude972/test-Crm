import { createServer } from 'node:http';
import { FindOperator, type DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
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
const setup = () => {
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
        rows.set(String(row.id), saved);
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
  );
  return {
    service,
    tables,
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
    const { service, people } = setup();
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

  it('keeps default manual and refuses AUTO when MCP is not configured', async () => {
    const { service, table, send } = setup();
    const incoming = await service.ingest(event);
    expect(
      table(HermesConversationEntity.name).get(incoming.conversationId)
        ?.botMode,
    ).toBe('MANUAL');
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
        if (++calls > 1) {
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
        if (++calls === 2) {
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
        if (++proposed === 2) {
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
      expect(proposed).toBe(2);
      expect(posted).toBe(0);
    } finally {
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
  it('persists bounded private provider metadata without using it as an authorization or direction grant',async()=>{
    const {service,table}=setup();const received=await service.ingest({...event,providerMetadata:{rfcMessageId:'<header@example.test>',inReplyTo:'<parent@example.test>',references:['<parent@example.test>'],mailbox:'INBOX',uidValidity:123,uid:45}});
    expect(table(HermesInboxMessageEntity.name).get(received.messageId)?.providerMetadata).toMatchObject({rfcMessageId:'<header@example.test>',uidValidity:'123',uid:45});
    expect(table(HermesInboxMessageEntity.name).get(received.messageId)?.status).toBe('RECEIVED');
  });
  it('rejects metadata privilege keys, header injection and oversized reference lists',async()=>{
    const {service}=setup();
    for(const providerMetadata of [{workspaceId:B},{rfcMessageId:'x\r\nBcc: private@example.test'},{rfcMessageId:'x'.repeat(999)},{references:Array.from({length:21},()=>'<x>')},{references:Array.from({length:20},()=> 'x'.repeat(998))},{uid:0}])await expect(service.ingest({...event,providerMetadata} as never)).rejects.toThrow('INVALID_MESSAGING_INPUT');
  });

});
