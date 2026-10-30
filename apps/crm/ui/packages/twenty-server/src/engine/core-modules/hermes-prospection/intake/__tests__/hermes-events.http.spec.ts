import { type INestApplication, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { type AddressInfo } from 'node:net';

import { HermesEventController } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.controller';
import { HermesEventService } from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-event.service';
import {
  mapHeyFormSubmission,
  mapCalDiyBooking,
} from 'src/engine/core-modules/hermes-prospection/intake/events/hermes-provider-mappers';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: (roleId: string) => ({
      intersectionOf: { user: [roleId] },
    }),
  }),
);

const A = randomUUID();
const B = randomUUID();
const connectionA = randomUUID();
const connectionB = randomUUID();
const secretA = randomBytes(32).toString('hex');
const secretB = randomBytes(32).toString('hex');
const occurredAt = '2026-10-30T12:00:00.000Z';
const form = () =>
  mapHeyFormSubmission(
    {
      id: randomUUID(),
      formId: 'contact-form',
      formName: 'Contact',
      fields: [],
      answers: [
        { id: 'email', title: 'Email', value: 'PERSON@example.test' },
        { id: 'company', title: 'Company', value: 'Synthetic company' },
      ],
      hiddenFields: [],
      variables: [],
    },
    {
      receivedAt: occurredAt,
      emailFieldId: 'email',
      companyFieldId: 'company',
    },
  );
const booking = () =>
  mapCalDiyBooking(
    {
      triggerEvent: 'BOOKING_CREATED',
      createdAt: occurredAt,
      payload: {
        uid: randomUUID(),
        status: 'ACCEPTED',
        title: 'Synthetic appointment',
        startTime: '2026-11-01T12:00:00.000Z',
        endTime: '2026-11-01T13:00:00.000Z',
        attendees: [{ email: 'person@example.test', firstName: 'Synthetic' }],
      },
    },
    { attendeeEmail: 'person@example.test' },
  );
type RecordValue = { id: string; deletedAt?: string; [key: string]: unknown };

// Real loopback Nest HTTP; native ORM/auth/cache are isolated fixtures. These
// tests do not claim a real SQL transaction, Redis persistence or provider send.
describe('Hermes Forms and Calendar ingress', () => {
  let app: INestApplication;
  let origin: string;
  const stores = new Map<string, Map<string, Map<string, RecordValue>>>();
  const revoked = new Set<string>();
  const suppressed = new Set<string>();
  const nonces = new Set<string>();
  const access = {
    assertAllowed: jest.fn(async (actor: { workspaceId: string }) => {
      if (revoked.has(actor.workspaceId)) throw new ForbiddenException();
    }),
  };
  let activeWorkspace = '';
  let tail = Promise.resolve();
  const store = (workspace: string, name: string) => {
    let ws = stores.get(workspace);
    if (!ws) {
      ws = new Map();
      stores.set(workspace, ws);
    }
    let table = ws.get(name);
    if (!table) {
      table = new Map();
      ws.set(name, table);
    }
    return table;
  };
  const repository = (name: string) => {
    const table = store(activeWorkspace, name);
    return {
      insert: async (value: RecordValue) => {
        if (table.has(value.id)) throw new Error('duplicate native id');
        table.set(value.id, structuredClone(value));
      },
      findOne: async ({ where }: { where: { id: string } }) =>
        table.get(where.id) ?? null,
      createQueryBuilder: () => {
        let parameters: { email?: string; name?: string } = {};
        const query = {
          withDeleted: () => query,
          where: (_sql: string, params: typeof parameters) => {
            parameters = params;
            return query;
          },
          take: () => query,
          getMany: async () =>
            [...table.values()]
              .filter((value) =>
                parameters.email
                  ? (
                      value.emails as { primaryEmail: string }
                    ).primaryEmail.toLowerCase() === parameters.email
                  : String(value.name).trim().toLowerCase() === parameters.name,
              )
              .slice(0, 2),
        };
        return query;
      },
    };
  };
  const orm = {
    executeInWorkspaceContext: async (
      work: () => Promise<unknown>,
      context: { workspace: { id: string } },
    ) => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      activeWorkspace = context.workspace.id;
      try {
        return await work();
      } finally {
        release();
      }
    },
    runInWorkspaceTransaction: async (
      work: (transaction: unknown) => Promise<unknown>,
    ) => {
      const before = structuredClone(stores.get(activeWorkspace));
      try {
        return await work({
          executeRawQuery: async () => [],
          getRepository: (name: string) => repository(name),
        });
      } catch (error) {
        if (before) stores.set(activeWorkspace, before);
        else stores.delete(activeWorkspace);
        throw error;
      }
    },
  };
  const post = async (
    kind: 'forms' | 'calendar',
    body: object,
    options: {
      connection?: string;
      secret?: string;
      nonce?: string;
      bad?: boolean;
    } = {},
  ) => {
    const connection = options.connection ?? connectionA;
    const nonce = options.nonce ?? randomUUID();
    const timestamp = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify(body);
    const signature = createHmac(
      'sha256',
      Buffer.from(options.secret ?? secretA, 'hex'),
    )
      .update(`v1\n${connection}\n${timestamp}\n${nonce}\n`)
      .update(raw)
      .digest('hex');
    return fetch(`${origin}/webhooks/hermes/${kind}/${connection}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hermes-timestamp': timestamp,
        'x-hermes-nonce': nonce,
        'x-hermes-signature': `v1=${signature}`,
      },
      body: options.bad ? `${raw} ` : raw,
    });
  };
  beforeAll(async () => {
    jest.useRealTimers();
    const config = {
      get: () =>
        JSON.stringify({
          [connectionA]: {
            workspaceId: A,
            operatorUserId: randomUUID(),
            operatorUserWorkspaceId: randomUUID(),
            secret: secretA,
          },
          [connectionB]: {
            workspaceId: B,
            operatorUserId: randomUUID(),
            operatorUserWorkspaceId: randomUUID(),
            secret: secretB,
          },
        }),
    };
    const replay = {
      claim: async (connection: string, nonce: string) => {
        const key = `${connection}:${nonce}`;
        if (nonces.has(key)) return 'replayed';
        nonces.add(key);
        return 'claimed';
      },
    };
    const service = new HermesEventService(
      config as never,
      replay as never,
      access as never,
      { getRoleIdForUserWorkspace: async () => randomUUID() } as never,
      orm as never,
      {
        findApplicableSuppressions: async ({
          workspaceId,
        }: {
          workspaceId: string;
        }) => (suppressed.has(workspaceId) ? [{ reason: 'UNSUBSCRIBE' }] : []),
      } as never,
      {
        findOneBy: async ({ id }: { id: string }) => ({
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as never,
    );
    const module = await Test.createTestingModule({
      controllers: [HermesEventController],
      providers: [{ provide: HermesEventService, useValue: service }],
    }).compile();
    app = module.createNestApplication({ rawBody: true, logger: false });
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });
  beforeEach(() => {
    stores.clear();
    revoked.clear();
    suppressed.clear();
    nonces.clear();
    access.assertAllowed.mockClear();
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates one native contact, company, Note and linked target; repeats without duplicates', async () => {
    const payload = form();
    const first = await post('forms', payload);
    expect(first.status).toBe(200);
    const receipt = await first.json();
    expect(receipt).toMatchObject({
      replay: false,
      calendarEventId: null,
      marketingConsentGranted: false,
    });
    const retry = await post('forms', payload);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ ...receipt, replay: true });
    expect(store(A, 'person').size).toBe(1);
    expect(store(A, 'company').size).toBe(1);
    expect(store(A, 'note').size).toBe(1);
    expect(
      store(A, 'noteTarget').get([...store(A, 'noteTarget').keys()][0]),
    ).toMatchObject({
      targetPersonId: receipt.personId,
      noteId: receipt.noteId,
    });
  });
  it('isolates the same email and source ID in two configured workspaces', async () => {
    const payload = form();
    const first = await (await post('forms', payload)).json();
    const second = await (
      await post('forms', payload, { connection: connectionB, secret: secretB })
    ).json();
    expect(first.personId).not.toBe(second.personId);
    expect(first.noteId).not.toBe(second.noteId);
    expect(store(A, 'note').size).toBe(1);
    expect(store(B, 'note').size).toBe(1);
  });
  it('links distinct form submissions to the existing contact without overwriting it', async () => {
    const first = await (await post('forms', form())).json();
    const second = await (await post('forms', form())).json();
    expect(first.personId).toBe(second.personId);
    expect(store(A, 'person').size).toBe(1);
    expect(store(A, 'note').size).toBe(2);
  });
  it('rejects altered replay payload instead of rewriting history', async () => {
    const payload = form();
    await post('forms', payload);
    const changed = {
      ...payload,
      event: { ...payload.event, summary: 'changed' },
    };
    expect((await post('forms', changed)).status).toBe(409);
    expect(store(A, 'note').size).toBe(1);
  });
  it('refuses bad signature before access, cache or native state', async () => {
    expect((await post('forms', form(), { bad: true })).status).toBe(401);
    expect(access.assertAllowed).not.toHaveBeenCalled();
    expect(stores.size).toBe(0);
    expect(nonces.size).toBe(0);
  });
  it('refuses workspace/body injection and cross-route provider payloads', async () => {
    expect((await post('forms', { ...form(), workspaceId: B })).status).toBe(
      400,
    );
    expect((await post('calendar', form())).status).toBe(400);
    expect(stores.size).toBe(0);
  });
  it('refuses revoked operator before any native lookup or write', async () => {
    revoked.add(A);
    expect((await post('forms', form())).status).toBe(403);
    expect(stores.size).toBe(0);
  });
  it('preserves opposition and does not recreate an archived contact', async () => {
    suppressed.add(A);
    expect((await post('forms', form())).status).toBe(409);
    expect(store(A, 'person').size).toBe(0);
    suppressed.clear();
    await post('forms', form());
    const person = [...store(A, 'person').values()][0];
    person.deletedAt = occurredAt;
    expect((await post('forms', form())).status).toBe(409);
    expect(store(A, 'person').size).toBe(1);
  });
  it('creates a real native CalendarEvent + target for an accepted booking only', async () => {
    const payload = booking();
    const response = await post('calendar', payload);
    expect(response.status).toBe(200);
    const receipt = await response.json();
    expect(
      store(A, 'calendarEvent').get(receipt.calendarEventId),
    ).toMatchObject({
      startsAt: payload.event.startsAt,
      endsAt: payload.event.endsAt,
      isCanceled: false,
    });
    expect(store(A, 'calendarEventTarget').size).toBe(1);
    expect(
      (
        await post('calendar', {
          ...payload,
          eventId: randomUUID(),
          event: { ...payload.event, status: 'PENDING' },
        })
      ).status,
    ).toBe(400);
  });
  it('rejects exact signed nonce replay and rolls back partial native writes on conflict', async () => {
    const payload = form();
    const nonce = randomUUID();
    expect((await post('forms', payload, { nonce })).status).toBe(200);
    expect((await post('forms', payload, { nonce })).status).toBe(409);
    const before = store(A, 'note').size;
    const existing = [...store(A, 'person').values()][0];
    existing.companyId = randomUUID();
    expect((await post('forms', form())).status).toBe(409);
    expect(store(A, 'note').size).toBe(before);
  });
  it('rejects ambiguous or non-text mapped Forms identities and unconfirmed Calendar sources', () => {
    expect(() =>
      mapHeyFormSubmission(
        {
          id: 'x',
          formId: 'f',
          formName: 'f',
          answers: [{ id: 'e', title: 'e', value: ['email@example.test'] }],
        },
        { receivedAt: occurredAt, emailFieldId: 'e' },
      ),
    ).toThrow();
    expect(() =>
      mapCalDiyBooking(
        {
          triggerEvent: 'BOOKING_REQUESTED',
          createdAt: occurredAt,
          payload: {},
        },
        { attendeeEmail: 'person@example.test' },
      ),
    ).toThrow();
  });
});
