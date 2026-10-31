import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

// R05 — origin and company identifiable for every inbound item, known and
// unknown contacts handled, duplicates reported, links to the record and the
// existing pipeline, and never an opportunity created by an inbound item.
// Native persistence is an isolated fixture: no SQL or provider is contacted.
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
const eventId = 'event-42';
const bookingUid = 'booking-7';
const eventKey = (connectionId: string, provider: string, id = eventId) =>
  JSON.stringify([A, connectionId, provider, id]);
const noteIdFor = (connectionId: string, provider: string, id = eventId) =>
  v5(`note:${eventKey(connectionId, provider, id)}`, v5.URL);
const targetIdFor = (connectionId: string, provider: string, id = eventId) =>
  v5(`target:${eventKey(connectionId, provider, id)}`, v5.URL);
const calendarIdFor = (connectionId: string, uid: string) =>
  v5(`calendar:${JSON.stringify([A, connectionId, uid])}`, v5.URL);
const connectionEntry = (
  workspaceId: string,
  allowedSources: string[],
) => ({
  workspaceId,
  operatorUserId: randomUUID(),
  operatorUserWorkspaceId: randomUUID(),
  secret: randomBytes(32).toString('hex'),
  allowedSources,
});

function fixture() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const requested: string[] = [];
  const table = (name: string) => {
    let value = tables.get(name);
    if (!value) {
      value = new Map();
      tables.set(name, value);
    }
    return value;
  };
  const access = { assertAllowed: jest.fn(async () => undefined) };
  const prospection = { list: jest.fn(async () => ({ batches: [] })) };
  const config = {
    get: jest.fn(() =>
      JSON.stringify({
        [formsConnection]: connectionEntry(A, ['FORMS']),
        [calendarConnection]: connectionEntry(A, ['CALENDAR']),
        // Another company's connection must never become a candidate.
        [foreignConnection]: connectionEntry(B, ['FORMS', 'CALENDAR']),
      }),
    ),
  };
  const orm = {
    executeInWorkspaceContext: jest.fn(
      async <T>(work: () => Promise<T>) => work(),
    ),
    getRepository: jest.fn((name: string) => {
      requested.push(name);
      return {
        findOne: async ({ where }: { where: { id: string } }) =>
          table(name).get(where.id) ?? null,
        find: async ({ where }: { where: { pointOfContactId: string } }) =>
          [...table(name).values()].filter(
            (row) => row.pointOfContactId === where.pointOfContactId,
          ),
      };
    }),
  };
  const service = new HermesInboundClassificationService(
    access as never,
    config as never,
    prospection as never,
    { getRoleIdForUserWorkspace: jest.fn(async () => 'role-a') } as never,
    orm as never,
    { findOneBy: jest.fn(async () => ({ id: A })) } as never,
  );
  return { service, access, config, prospection, table, requested, orm };
}

describe('Hermes inbound classification', () => {
  it('classifies a form receipt with its verified connection, company and record links', async () => {
    const f = fixture();
    const personId = randomUUID();
    const companyId = randomUUID();
    f.table('note').set(noteIdFor(formsConnection, 'HEYFORM'), {
      id: noteIdFor(formsConnection, 'HEYFORM'),
      createdAt: '2026-10-30T14:00:00.000Z',
      bodyV2: {
        markdown: `Hermes receipt SHA256 ${'b'.repeat(64)}\n\nSource: HEYFORM\nEvent: ${eventId}\nReported at: 2026-10-30T12:00:00.000Z\n\nSynthetic`,
      },
    });
    f.table('noteTarget').set(targetIdFor(formsConnection, 'HEYFORM'), {
      id: targetIdFor(formsConnection, 'HEYFORM'),
      targetPersonId: personId,
      targetCompanyId: companyId,
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'HEYFORM',
      eventId,
    });

    expect(result.status).toBe('CLASSIFIED');
    expect(result.origin).toEqual({
      source: 'FORMS',
      provider: 'HEYFORM',
      connectionId: formsConnection,
      structureId: A,
      eventId,
      receivedAt: '2026-10-30T14:00:00.000Z',
      attribution: 'VERIFIED',
    });
    expect(result.links).toEqual({
      personId,
      companyId,
      noteId: noteIdFor(formsConnection, 'HEYFORM'),
      // No booking identifier was supplied, so none is guessed.
      calendarEventId: null,
      // Forms receipts have no messaging conversation; this stays null.
      conversationId: null,
      existingOpportunityIds: [],
    });
    expect(result.contactState).toBe('LINKED');
    expect(result.automaticDealCreated).toBe(false);
  });

  it('reports the existing pipeline of the linked contact without creating one', async () => {
    const f = fixture();
    const personId = randomUUID();
    const opportunityId = randomUUID();
    f.table('note').set(noteIdFor(formsConnection, 'HEYFORM'), {
      id: noteIdFor(formsConnection, 'HEYFORM'),
      bodyV2: { markdown: `Hermes receipt SHA256 ${'c'.repeat(64)}\n` },
    });
    f.table('noteTarget').set(targetIdFor(formsConnection, 'HEYFORM'), {
      id: targetIdFor(formsConnection, 'HEYFORM'),
      targetPersonId: personId,
      targetCompanyId: null,
    });
    f.table('opportunity').set(opportunityId, {
      id: opportunityId,
      pointOfContactId: personId,
    });
    f.table('opportunity').set('other', {
      id: 'other',
      pointOfContactId: randomUUID(),
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'HEYFORM',
      eventId,
    });

    // Only the contact's own opportunity. The fixture repository exposes
    // findOne/find and no write method at all, so the pipeline is reached
    // read-only: any insert or update attempt would throw here.
    expect(result.links?.existingOpportunityIds).toEqual([opportunityId]);
    expect(result.automaticDealCreated).toBe(false);
    expect(f.requested).toContain('opportunity');
  });

  it('classifies a booking and resolves its calendar record from the supplied booking identifier', async () => {
    const f = fixture();
    f.table('note').set(noteIdFor(calendarConnection, 'CAL_DIY'), {
      id: noteIdFor(calendarConnection, 'CAL_DIY'),
      bodyV2: { markdown: `Hermes receipt SHA256 ${'d'.repeat(64)}\n` },
    });
    f.table('calendarEvent').set(calendarIdFor(calendarConnection, bookingUid), {
      id: calendarIdFor(calendarConnection, bookingUid),
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'CAL_DIY',
      eventId,
      bookingUid,
    });

    expect(result.status).toBe('CLASSIFIED');
    expect(result.origin).toMatchObject({
      source: 'CALENDAR',
      provider: 'CAL_DIY',
      connectionId: calendarConnection,
      attribution: 'VERIFIED',
    });
    expect(result.links?.calendarEventId).toBe(
      calendarIdFor(calendarConnection, bookingUid),
    );
    // Unknown contact: the receipt exists, nothing is invented for it.
    expect(result.links?.personId).toBeNull();
    expect(result.contactState).toBe('UNLINKED');
  });

  it('reports an edited receipt as attributed but no longer intact', async () => {
    const f = fixture();
    f.table('note').set(noteIdFor(formsConnection, 'HEYFORM'), {
      id: noteIdFor(formsConnection, 'HEYFORM'),
      bodyV2: { markdown: 'Rewritten by hand' },
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'HEYFORM',
      eventId,
    });

    expect(result.origin).toMatchObject({
      connectionId: formsConnection,
      attribution: 'EDITED_RECEIPT',
      receivedAt: null,
    });
  });

  it('keeps the server receipt time when a note body is edited', async () => {
    const f = fixture();
    f.table('note').set(noteIdFor(formsConnection, 'HEYFORM'), {
      id: noteIdFor(formsConnection, 'HEYFORM'),
      createdAt: '2026-10-30T14:00:00.000Z',
      bodyV2: {
        markdown: 'Rewritten by hand\nReported at: 2000-01-01T00:00:00.000Z',
      },
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'HEYFORM',
      eventId,
    });

    expect(result.origin).toMatchObject({
      attribution: 'EDITED_RECEIPT',
      receivedAt: '2026-10-30T14:00:00.000Z',
    });
  });

  it('never attributes a receipt to another company connection', async () => {
    const f = fixture();
    // A note stored under the foreign company's connection key: its
    // identifier is not one this company's connections can produce.
    const foreignKey = JSON.stringify([A, foreignConnection, 'HEYFORM', eventId]);
    f.table('note').set(v5(`note:${foreignKey}`, v5.URL), {
      id: v5(`note:${foreignKey}`, v5.URL),
      bodyV2: { markdown: `Hermes receipt SHA256 ${'e'.repeat(64)}\n` },
    });

    const result = await f.service.classifyBridgeEvent(actor, {
      provider: 'HEYFORM',
      eventId,
    });

    expect(result).toMatchObject({
      status: 'NOT_FOUND',
      origin: null,
      links: null,
      automaticDealCreated: false,
    });
    expect(JSON.stringify(result)).not.toContain(foreignConnection);
    expect(JSON.stringify(result)).not.toContain(B);
  });

  it('requires a company connection granting the matching source', async () => {
    const f = fixture();
    f.config.get.mockReturnValue(
      JSON.stringify({
        // Only a scraping grant: a form receipt is not classifiable through it.
        [formsConnection]: connectionEntry(A, ['SCRAPING']),
      }),
    );

    await expect(
      f.service.classifyBridgeEvent(actor, { provider: 'HEYFORM', eventId }),
    ).resolves.toMatchObject({ status: 'NOT_CONFIGURED', origin: null });
  });

  it('refuses a revoked administrator before and after reading the records', async () => {
    const before = fixture();
    before.access.assertAllowed.mockRejectedValue(new ForbiddenException());
    await expect(
      before.service.classifyBridgeEvent(actor, {
        provider: 'HEYFORM',
        eventId,
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(before.config.get).not.toHaveBeenCalled();

    const during = fixture();
    during.table('note').set(noteIdFor(formsConnection, 'HEYFORM'), {
      id: noteIdFor(formsConnection, 'HEYFORM'),
      bodyV2: { markdown: `Hermes receipt SHA256 ${'f'.repeat(64)}\n` },
    });
    during.access.assertAllowed
      .mockImplementationOnce(async () => undefined)
      .mockRejectedValueOnce(new ForbiddenException());
    await expect(
      during.service.classifyBridgeEvent(actor, {
        provider: 'HEYFORM',
        eventId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses an unsupported provider and a booking identifier on a form', async () => {
    const f = fixture();

    await expect(
      f.service.classifyBridgeEvent(actor, {
        provider: 'TYPEFORM',
        eventId,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      f.service.classifyBridgeEvent(actor, {
        provider: 'HEYFORM',
        eventId,
        bookingUid,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('classifies scraping deposits with their provenance, duplicates and qualified links', async () => {
    const f = fixture();
    const personId = randomUUID();
    f.prospection.list.mockResolvedValue({
      batches: [
        {
          id: 'batch-1',
          externalBatchId: `${formsConnection}:directory`,
          origin: {
            kind: 'SIGNED_INTAKE',
            connectionId: formsConnection,
            receivedAt: '2026-10-30T09:00:00.000Z',
          },
          rows: [
            { id: 'r1', status: 'qualified', personId, companyId: 'c1' },
            { id: 'r2', status: 'duplicate' },
            { id: 'r3', status: 'invalid' },
            { id: 'r4', status: 'pending' },
            { id: 'r5', status: 'suppressed' },
            { id: 'r6', status: 'conflict' },
          ],
        },
        {
          id: 'batch-2',
          externalBatchId: 'manual',
          origin: { kind: 'MANUAL' },
          rows: [{ id: 'r7', status: 'pending' }],
        },
      ],
    });

    const result = await f.service.classifyScrapingBatches(actor);

    expect(result.structureId).toBe(A);
    expect(result.automaticDealCreated).toBe(false);
    expect(result.batches[0]).toMatchObject({
      batchId: 'batch-1',
      origin: {
        source: 'SCRAPING',
        provider: null,
        connectionId: formsConnection,
        structureId: A,
        receivedAt: '2026-10-30T09:00:00.000Z',
        attribution: 'VERIFIED',
      },
      counts: {
        total: 6,
        pending: 1,
        invalid: 1,
        duplicate: 1,
        suppressed: 1,
        conflict: 1,
        qualified: 1,
      },
      qualificationRequired: true,
      linkedPersonIds: [personId],
      linkedCompanyIds: ['c1'],
    });
    // A manual deposit is not presented as an attributed automatic reception.
    expect(result.batches[1].origin).toMatchObject({
      connectionId: null,
      receivedAt: null,
      attribution: 'NOT_ATTRIBUTABLE',
    });
    expect(result.batches[1].qualificationRequired).toBe(true);
  });
});
