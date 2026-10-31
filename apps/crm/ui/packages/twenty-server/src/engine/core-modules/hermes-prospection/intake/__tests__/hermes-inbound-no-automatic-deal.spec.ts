import { createHmac, randomUUID } from 'node:crypto';

import {
  HermesConnectionsService,
  type HermesResolvedConnection,
} from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesProspectionService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection.service';
import { emptyHermesProspectionState } from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';
import { type HermesProspectionState } from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';
import { HermesEventService } from '../events/hermes-event.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service',
  () => ({ HermesProspectionAccessService: class {} }),
);
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-import-state.service',
  () => ({ HermesImportStateService: class {} }),
);
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: (roleId: string) => ({
      intersectionOf: { user: [roleId] },
    }),
  }),
);

// R05 — an inbound item must never create an opportunity on its own. This is a
// hard requirement, so these tests assert the exact set of native tables each
// inbound path writes, rather than only that the request succeeded. They are
// isolated fixtures: no SQL, Redis, provider or prospect is contacted.
const workspaceId = randomUUID();
const connectionId = randomUUID();
const userId = randomUUID();
const userWorkspaceId = randomUUID();
const secret = 'a'.repeat(64);
const contact = {
  email: 'person@example.test',
  firstName: 'Synthetic',
  lastName: '',
  companyName: 'Example Company',
};
const PIPELINE_TABLES = [
  'opportunity',
  'opportunityParticipant',
  'pipelineStep',
  'favorite',
];

const formEnvelope = (eventId: string) => ({
  version: 'hermes-bridge-v1',
  eventId,
  occurredAt: new Date().toISOString(),
  provider: 'HEYFORM',
  contact,
  event: {
    type: 'SUBMISSION_RECEIVED',
    formId: 'form-1',
    formName: 'Demande de rappel',
    summary: 'Synthetic demonstration submission',
  },
});
const bookingEnvelope = (eventId: string, bookingUid: string) => ({
  version: 'hermes-bridge-v1',
  eventId,
  occurredAt: new Date().toISOString(),
  provider: 'CAL_DIY',
  contact,
  event: {
    type: 'BOOKING_CREATED',
    bookingUid,
    status: 'ACCEPTED',
    title: 'Premier rendez-vous',
    startsAt: '2026-11-02T10:00:00.000Z',
    endsAt: '2026-11-02T11:00:00.000Z',
    location: '',
  },
});

function eventFixture(allowedSources: string[]) {
  const inserted: string[] = [];
  const updated: string[] = [];
  const requested: string[] = [];
  const rows = new Map<string, Map<string, Record<string, unknown>>>();
  const snapshot: HermesResolvedConnection = {
    workspaceId,
    connectionId,
    userId,
    userWorkspaceId,
    revision: 1,
    settings: { allowedSources, maxRequestsPerMinute: 10 },
    secrets: { secret },
  };
  const query = jest.fn(async (sql: string) =>
    sql.startsWith('SELECT "revision"')
      ? [{ connectionId, revision: 1, enabled: true }]
      : [],
  );
  const table = (name: string) => {
    let value = rows.get(name);
    if (!value) {
      value = new Map();
      rows.set(name, value);
    }
    return value;
  };
  const repository = (name: string) => {
    requested.push(name);
    return {
      findOne: async ({ where }: { where: { id: string } }) =>
        table(name).get(where.id) ?? null,
      insert: async (value: Record<string, unknown>) => {
        inserted.push(name);
        table(name).set(String(value.id), value);
      },
      update: async (id: string, values: Record<string, unknown>) => {
        updated.push(name);
        Object.assign(table(name).get(String(id)) ?? {}, values);
      },
      createQueryBuilder: () => {
        let parameters: { email?: string; name?: string } = {};
        const builder = {
          withDeleted: () => builder,
          where: (_sql: string, params: typeof parameters) => {
            parameters = params;
            return builder;
          },
          take: () => builder,
          getMany: async () =>
            [...table(name).values()].filter((value) =>
              parameters.email
                ? (value.emails as { primaryEmail?: string })?.primaryEmail ===
                  parameters.email
                : String(value.name ?? '').toLowerCase() === parameters.name,
            ),
        };
        return builder;
      },
    };
  };
  const orm = {
    executeInWorkspaceContext: async (work: () => Promise<unknown>) => work(),
    runInWorkspaceTransaction: async (
      work: (transaction: unknown) => Promise<unknown>,
    ) =>
      work({ executeRawQuery: query, getRepository: repository }),
  };
  const service = new HermesEventService(
    {
      get: () => {
        throw new Error('MUST_NOT_USE_ENV');
      },
    } as never,
    { claim: async () => 'claimed' } as never,
    { assertAllowed: jest.fn(async () => undefined) } as never,
    { getRoleIdForUserWorkspace: async () => randomUUID() } as never,
    orm as never,
    { findApplicableSuppressions: async () => [] } as never,
    {
      findOneBy: async () => ({
        id: workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never,
    {
      resolveByConnectionId: jest.fn(async () => snapshot),
      assertRevisionViaQuery:
        HermesConnectionsService.prototype.assertRevisionViaQuery,
    } as never,
  );
  const send = (kind: 'forms' | 'calendar', envelope: object) => {
    const body = Buffer.from(JSON.stringify(envelope));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomUUID();
    const signature = `v1=${createHmac('sha256', Buffer.from(secret, 'hex'))
      .update(`v1\n${connectionId}\n${timestamp}\n${nonce}\n`)
      .update(body)
      .digest('hex')}`;
    return service.receive(kind, connectionId, body, {
      timestamp,
      nonce,
      signature,
    });
  };
  return { send, inserted, updated, requested, rows };
}

describe('R05 — no inbound item creates an opportunity on its own', () => {
  it('a signed form submission writes only the contact, company and receipt note', async () => {
    const f = eventFixture(['FORMS']);

    const result = await f.send('forms', formEnvelope('event-1'));

    expect(result).toMatchObject({
      replay: false,
      marketingConsentGranted: false,
    });
    expect(result.personId).toBeTruthy();
    // The exact native write set. A pipeline table appearing here would be an
    // automatic deal, which this requirement forbids.
    expect([...new Set(f.inserted)].sort()).toEqual([
      'company',
      'note',
      'noteTarget',
      'person',
    ]);
    for (const forbidden of PIPELINE_TABLES)
      expect(f.requested).not.toContain(forbidden);
  });

  it('an accepted booking writes the calendar record without an opportunity', async () => {
    const f = eventFixture(['CALENDAR']);

    const result = await f.send(
      'calendar',
      bookingEnvelope('event-2', randomUUID()),
    );

    expect(result.calendarEventId).toBeTruthy();
    expect([...new Set(f.inserted)].sort()).toEqual([
      'calendarEvent',
      'calendarEventTarget',
      'company',
      'note',
      'noteTarget',
      'person',
    ]);
    for (const forbidden of PIPELINE_TABLES)
      expect(f.requested).not.toContain(forbidden);
  });

  it('repeated inbound items for one contact create no deal and no duplicate contact', async () => {
    const f = eventFixture(['FORMS', 'CALENDAR']);

    const first = await f.send('forms', formEnvelope('event-3'));
    const second = await f.send('forms', formEnvelope('event-4'));
    const third = await f.send(
      'calendar',
      bookingEnvelope('event-5', randomUUID()),
    );

    // One contact and one company across three inbound items, each with its
    // own receipt note: provenance per item, no duplicated record.
    expect(first.personId).toBe(second.personId);
    expect(second.personId).toBe(third.personId);
    expect(f.inserted.filter((name) => name === 'person')).toHaveLength(1);
    expect(f.inserted.filter((name) => name === 'company')).toHaveLength(1);
    expect(f.inserted.filter((name) => name === 'note')).toHaveLength(3);
    expect(f.rows.get('note')?.size).toBe(3);
    for (const forbidden of PIPELINE_TABLES)
      expect(f.requested).not.toContain(forbidden);
  });

  it('a replayed form receipt neither duplicates nor creates anything', async () => {
    const f = eventFixture(['FORMS']);
    const envelope = formEnvelope('event-6');

    const first = await f.send('forms', envelope);
    f.inserted.length = 0;
    const replay = await f.send('forms', envelope);

    expect(replay.replay).toBe(true);
    expect(replay.personId).toBe(first.personId);
    expect(f.inserted).toEqual([]);
    for (const forbidden of PIPELINE_TABLES)
      expect(f.requested).not.toContain(forbidden);
  });

  it('a scraping deposit touches no contact, company or pipeline table before human qualification', async () => {
    const state = emptyHermesProspectionState();
    const requested: string[] = [];
    const orm = {
      executeInWorkspaceContext: jest.fn(
        async <T>(operation: () => Promise<T>) => operation(),
      ),
      getRepository: jest.fn((name: string) => {
        requested.push(String(name));
        return {};
      }),
      runInWorkspaceTransaction: jest.fn(),
    };
    const service = new HermesProspectionService(
      {
        read: jest.fn(async () => state),
        mutate: jest.fn(
          async <T>(
            _actor: unknown,
            operation: (value: HermesProspectionState) => Promise<T>,
          ) => operation(state),
        ),
      } as never,
      { findApplicableSuppressions: jest.fn(async () => []) } as never,
      orm as never,
      { getRoleIdForUserWorkspace: jest.fn(async () => 'role-a') } as never,
    );

    const result = await service.createBatch(
      { workspaceId, userId, userWorkspaceId },
      {
        externalBatchId: 'synthetic-batch',
        name: 'Annuaire de démonstration',
        sourceUrl: 'https://example.test/directory',
        collectedAt: '2026-10-30T12:00:00.000Z',
        rows: [{ email: contact.email, companyName: contact.companyName }],
      },
      { connectionId },
    );

    // The deposit is staged with its signed provenance and stays there: the
    // company is identifiable, and nothing reaches the CRM or the pipeline.
    expect(result.batch.origin).toEqual({
      kind: 'SIGNED_INTAKE',
      connectionId,
      receivedAt: result.batch.createdAt,
    });
    expect(result.batch.rows).toHaveLength(1);
    for (const forbidden of [...PIPELINE_TABLES, 'person', 'company'])
      expect(requested).not.toContain(forbidden);
  });
});
