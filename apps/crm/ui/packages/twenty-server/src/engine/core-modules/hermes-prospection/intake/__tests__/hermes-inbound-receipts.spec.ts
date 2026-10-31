import { ForbiddenException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import { v5 } from 'uuid';

import { HermesInboundClassificationService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-inbound-classification.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service',
  () => ({ HermesProspectionAccessService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection.service',
  () => ({ HermesProspectionService: class {} }),
);
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
// Kept out of the import graph: both pull the ESM-only `ai` package that this
// jest configuration does not transform, which already breaks the sibling spec.
jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: (roleId: string) => ({
      intersectionOf: { user: [roleId] },
    }),
  }),
);
jest.mock(
  'src/engine/core-modules/auth/utils/build-system-auth-context.util',
  () => ({ buildSystemAuthContext: (value: unknown) => value }),
);
jest.mock(
  'src/engine/core-modules/workspace/utils/from-workspace-entity-to-flat.util',
  () => ({ fromWorkspaceEntityToFlat: (value: unknown) => value }),
);

// The receipts of a company, listed and reprovable. Native persistence is an
// isolated in-memory double: the row double honours the marker prefix and the
// cap, so the attribution recomputation and the cut are what is asserted here.
// The SQL predicate itself is not exercised by a unit test.
const A = randomUUID();
const B = randomUUID();
const formsConnection = randomUUID();
const calendarConnection = randomUUID();
const foreignConnection = randomUUID();
const actor = {
  workspaceId: A,
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const MARKER = 'Hermes receipt SHA256 ';
const noteIdFor = (connectionId: string, provider: string, eventId: string) =>
  v5(
    `note:${JSON.stringify([A, connectionId, provider, eventId])}`,
    v5.URL,
  );
const connectionEntry = (workspaceId: string, allowedSources: string[]) => ({
  workspaceId,
  operatorUserId: randomUUID(),
  operatorUserWorkspaceId: randomUUID(),
  secret: randomBytes(32).toString('hex'),
  allowedSources,
});
// Mirrors the escaping the receipt body is written with.
const escaped = (value: string) =>
  value.replace(/[\\`*_{}[\]()#+.!<>|~]/g, '\\$&');
const receiptBody = (
  provider: string,
  eventId: string,
  reportedAt = '2026-10-30T12:00:00.000Z',
) =>
  `${MARKER}${'a'.repeat(64)}\n\nSource: ${provider}\nEvent: ${escaped(eventId)}\nReported at: ${reportedAt}\n\nSynthetic`;

function fixture(connections?: Record<string, unknown>) {
  const notes: Record<string, unknown>[] = [];
  const queries: { sql: string; parameters: unknown; take: number }[] = [];
  const access = { assertAllowed: jest.fn(async () => undefined) };
  const config = {
    get: jest.fn(() =>
      JSON.stringify(
        connections ?? {
          [formsConnection]: connectionEntry(A, ['FORMS']),
          [calendarConnection]: connectionEntry(A, ['CALENDAR']),
          // Another company's connection must never become a candidate.
          [foreignConnection]: connectionEntry(B, ['FORMS', 'CALENDAR']),
        },
      ),
    ),
  };
  const orm = {
    executeInWorkspaceContext: jest.fn(
      async <T>(work: () => Promise<T>) => work(),
    ),
    getRepository: jest.fn(() => ({
      createQueryBuilder: () => {
        const state = { sql: '', parameters: {} as never, take: 0 };
        const builder = {
          where: (sql: string, parameters: never) => {
            Object.assign(state, { sql, parameters });
            return builder;
          },
          orderBy: () => builder,
          take: (value: number) => {
            state.take = value;
            return builder;
          },
          getMany: async () => {
            queries.push({ ...state });
            const marker = (state.parameters as { marker?: string }).marker;
            const prefix = (marker ?? '').replace(/%$/, '');
            return notes
              .filter((note) =>
                String(
                  (note.bodyV2 as { markdown?: string } | undefined)
                    ?.markdown ?? '',
                ).startsWith(prefix),
              )
              .slice(0, state.take);
          },
        };
        return builder;
      },
    })),
  };
  const service = new HermesInboundClassificationService(
    access as never,
    config as never,
    { list: jest.fn() } as never,
    { getRoleIdForUserWorkspace: jest.fn(async () => 'role-a') } as never,
    orm as never,
    { findOneBy: jest.fn(async () => ({ id: A })) } as never,
  );
  const add = (connectionId: string, provider: string, eventId: string) => {
    const id = noteIdFor(connectionId, provider, eventId);
    notes.push({
      id,
      title: `Form: secret form name`,
      createdAt: '2026-10-30T14:00:00.000Z',
      bodyV2: { markdown: receiptBody(provider, eventId) },
    });
    return id;
  };
  return { service, access, config, notes, queries, add };
}

describe('Hermes inbound receipts list', () => {
  it.each(['HEYFORM', 'CAL_DIY'])(
    'does not use a provider timestamp as the receipt time for %s',
    async (provider) => {
      const f = fixture();
      const connectionId =
        provider === 'HEYFORM' ? formsConnection : calendarConnection;
      f.add(connectionId, provider, 'delayed-event');
      f.notes[0].bodyV2 = {
        markdown: receiptBody(
          provider,
          'delayed-event',
          '2000-01-01T00:00:00.000Z',
        ),
      };

      const page = await f.service.listBridgeReceipts(actor);

      expect(page.receipts[0].receivedAt).toBe('2026-10-30T14:00:00.000Z');
    },
  );

  it('reports an unknown receipt time instead of substituting the provider clock', async () => {
    const f = fixture();
    f.add(formsConnection, 'HEYFORM', 'missing-native-date');
    delete f.notes[0].createdAt;

    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts[0].receivedAt).toBeNull();
  });

  it('lists a form receipt with its canonical identifier and recomputed connection', async () => {
    const f = fixture();
    const noteId = f.add(formsConnection, 'HEYFORM', 'event-42');
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.status).toBe('LISTED');
    expect(page.cap).toBe(100);
    expect(page.truncated).toBe(false);
    expect(page.receipts).toEqual([
      {
        noteId,
        provider: 'HEYFORM',
        eventId: 'event-42',
        bookingUid: null,
        connectionId: formsConnection,
        structureId: A,
        receivedAt: '2026-10-30T14:00:00.000Z',
        attribution: 'VERIFIED',
      },
    ]);
  });

  it('returns the unescaped canonical identifier the provider console shows', async () => {
    const f = fixture();
    // The stored body escapes markdown metacharacters; the listed identifier
    // is the provider's own, and it still reproduces the row identifier.
    f.add(calendarConnection, 'CAL_DIY', 'evt_[2026].a*b');
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts[0].eventId).toBe('evt_[2026].a*b');
    expect(page.receipts[0].attribution).toBe('VERIFIED');
    expect(page.receipts[0].connectionId).toBe(calendarConnection);
  });

  it('keeps a row no connection reproduces listed, but unattributable', async () => {
    const f = fixture();
    // Carries the marker, yet its identifier is not the one this company,
    // connection, provider and event produce.
    f.notes.push({
      id: randomUUID(),
      bodyV2: { markdown: receiptBody('HEYFORM', 'event-42') },
    });
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts).toHaveLength(1);
    expect(page.receipts[0].attribution).toBe('NOT_ATTRIBUTABLE');
    expect(page.receipts[0].connectionId).toBeNull();
    expect(page.receipts[0].eventId).toBe('event-42');
  });

  it('never credits a receipt to another company connection', async () => {
    const f = fixture();
    // The identifier is the foreign company's own; it must not be attributed.
    f.notes.push({
      id: v5(
        `note:${JSON.stringify([B, foreignConnection, 'HEYFORM', 'event-9'])}`,
        v5.URL,
      ),
      bodyV2: { markdown: receiptBody('HEYFORM', 'event-9') },
    });
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts[0].connectionId).toBeNull();
    expect(page.receipts[0].attribution).toBe('NOT_ATTRIBUTABLE');
  });

  it('reports a provider it does not know instead of assigning a source', async () => {
    const f = fixture();
    f.notes.push({
      id: randomUUID(),
      bodyV2: { markdown: receiptBody('TYPEFORM', 'event-7') },
    });
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts[0].provider).toBeNull();
    expect(page.receipts[0].attribution).toBe('NOT_ATTRIBUTABLE');
  });

  it('caps the page and reports the cut rather than presenting a whole set', async () => {
    const f = fixture();
    for (let index = 0; index < 101; index += 1)
      f.add(formsConnection, 'HEYFORM', `event-${index}`);
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts).toHaveLength(100);
    expect(page.truncated).toBe(true);
    // One more than the cap is read, so the cut is observed and not guessed.
    expect(f.queries[0].take).toBe(101);
  });

  it('reads the rows by their receipt marker, parameterized', async () => {
    const f = fixture();
    f.add(formsConnection, 'HEYFORM', 'event-42');
    await f.service.listBridgeReceipts(actor);

    expect(f.queries[0].sql).toBe('"note"."bodyV2Markdown" LIKE :marker');
    expect(f.queries[0].parameters).toEqual({ marker: `${MARKER}%` });
  });

  it('exposes no receipt body, digest or title', async () => {
    const f = fixture();
    f.add(formsConnection, 'HEYFORM', 'event-42');
    const page = await f.service.listBridgeReceipts(actor);

    const serialized = JSON.stringify(page);
    expect(serialized).not.toContain('a'.repeat(64));
    expect(serialized).not.toContain('secret form name');
    expect(serialized).not.toContain('Hermes receipt');
    expect(Object.keys(page.receipts[0]).sort()).toEqual([
      'attribution',
      'bookingUid',
      'connectionId',
      'eventId',
      'noteId',
      'provider',
      'receivedAt',
      'structureId',
    ]);
  });

  it('never names a booking identifier the receipt does not store', async () => {
    const f = fixture();
    f.add(calendarConnection, 'CAL_DIY', 'event-55');
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.receipts[0].bookingUid).toBeNull();
  });

  it('says not configured, and reads no row, without a bridging connection', async () => {
    const f = fixture({
      [formsConnection]: connectionEntry(A, ['SCRAPING']),
      [foreignConnection]: connectionEntry(B, ['FORMS']),
    });
    const page = await f.service.listBridgeReceipts(actor);

    expect(page.status).toBe('NOT_CONFIGURED');
    expect(page.receipts).toEqual([]);
    expect(page.truncated).toBe(false);
    expect(f.queries).toHaveLength(0);
  });

  it('does not deliver rows when the role was revoked during the read', async () => {
    const f = fixture();
    f.add(formsConnection, 'HEYFORM', 'event-42');
    f.access.assertAllowed
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => {
        throw new ForbiddenException('HERMES_PROSPECTION_ACCESS_DENIED');
      });

    await expect(f.service.listBridgeReceipts(actor)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
