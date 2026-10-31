import {
  readHermesInboundItemClassification,
  readHermesScrapingClassification,
} from '@/prospection/utils/readHermesInboundClassification';

const origin = {
  source: 'FORMS',
  provider: 'HEYFORM',
  connectionId: 'connection-1',
  structureId: 'structure-1',
  eventId: 'event-42',
  receivedAt: '2026-10-30T12:00:00.000Z',
  attribution: 'VERIFIED',
};

describe('readHermesInboundItemClassification', () => {
  it('reads a classified receipt with its origin, links and no-deal statement', () => {
    const state = readHermesInboundItemClassification({
      status: 'CLASSIFIED',
      contactState: 'LINKED',
      automaticDealCreated: false,
      origin,
      links: {
        personId: 'person-1',
        companyId: 'company-1',
        noteId: 'note-1',
        calendarEventId: null,
        conversationId: null,
        existingOpportunityIds: ['opportunity-1'],
      },
    });

    expect(state).toEqual({
      kind: 'classified',
      item: {
        origin: {
          source: 'forms',
          provider: 'HEYFORM',
          connectionId: 'connection-1',
          structureId: 'structure-1',
          eventId: 'event-42',
          receivedAt: '2026-10-30T12:00:00.000Z',
          attribution: 'verified',
        },
        links: {
          personId: 'person-1',
          companyId: 'company-1',
          noteId: 'note-1',
          calendarEventId: null,
          // A form answer has no conversation, and none is invented.
          conversationId: null,
          existingOpportunityIds: ['opportunity-1'],
        },
        isContactLinked: true,
        automaticDealCreated: false,
      },
    });
  });

  it('keeps the three attributions distinct instead of collapsing them', () => {
    const attributionOf = (value: unknown) => {
      const state = readHermesInboundItemClassification({
        status: 'CLASSIFIED',
        contactState: 'UNLINKED',
        automaticDealCreated: false,
        origin: { ...origin, attribution: value },
        links: {},
      });

      return state.kind === 'classified' ? state.item.origin.attribution : null;
    };

    expect(attributionOf('VERIFIED')).toBe('verified');
    expect(attributionOf('EDITED_RECEIPT')).toBe('edited-receipt');
    expect(attributionOf('NOT_ATTRIBUTABLE')).toBe('not-attributable');
    // A fourth value is not silently rendered as one of the three, and an
    // absent one is not read as verified.
    expect(attributionOf('ATTRIBUTED')).toBeNull();
    expect(attributionOf(undefined)).toBeNull();
  });

  it('separates a company without a connection from a receipt it does not know', () => {
    expect(
      readHermesInboundItemClassification({ status: 'NOT_CONFIGURED' }),
    ).toEqual({ kind: 'not-configured' });
    // Not an error, and never 'unreadable'.
    expect(readHermesInboundItemClassification({ status: 'NOT_FOUND' })).toEqual(
      { kind: 'not-found' },
    );
  });

  it('never reads an absent or unusable payload as a classification', () => {
    expect(readHermesInboundItemClassification(null)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
    expect(readHermesInboundItemClassification('CLASSIFIED')).toEqual({
      kind: 'unreadable',
      problem: 'not-an-object',
    });
    expect(
      readHermesInboundItemClassification({ status: 'SOMETHING_ELSE' }),
    ).toEqual({ kind: 'unreadable', problem: 'unexpected-shape' });
  });

  it('reads an unusable no-deal statement as unknown rather than reassuring', () => {
    const state = readHermesInboundItemClassification({
      status: 'CLASSIFIED',
      contactState: 'UNLINKED',
      automaticDealCreated: 'false',
      origin,
      links: {},
    });

    // The string 'false' is not the boolean the contract declares, so the
    // panel must report that the statement is missing, not show it as made.
    expect(
      state.kind === 'classified' ? state.item.automaticDealCreated : 'absent',
    ).toBeNull();
  });

  it('falls back to the link when the contact state is unusable and never guesses linked', () => {
    const withPerson = readHermesInboundItemClassification({
      status: 'CLASSIFIED',
      contactState: 'MAYBE',
      automaticDealCreated: false,
      origin,
      links: { personId: 'person-1' },
    });
    const withoutPerson = readHermesInboundItemClassification({
      status: 'CLASSIFIED',
      contactState: 'MAYBE',
      automaticDealCreated: false,
      origin,
      links: {},
    });

    expect(
      withPerson.kind === 'classified' ? withPerson.item.isContactLinked : null,
    ).toBe(true);
    expect(
      withoutPerson.kind === 'classified'
        ? withoutPerson.item.isContactLinked
        : null,
    ).toBe(false);
  });

  it('drops invented identifiers rather than rendering them as records', () => {
    const state = readHermesInboundItemClassification({
      status: 'CLASSIFIED',
      contactState: 'LINKED',
      automaticDealCreated: false,
      origin,
      links: { existingOpportunityIds: ['opportunity-1', 42, null, 'o-2'] },
    });

    expect(
      state.kind === 'classified'
        ? state.item.links.existingOpportunityIds
        : null,
    ).toEqual(['opportunity-1', 'o-2']);
  });
});

describe('readHermesScrapingClassification', () => {
  it('reads the deposits with their provenance, counts and links', () => {
    const state = readHermesScrapingClassification({
      checkedAt: '2026-10-31T08:00:00.000Z',
      structureId: 'structure-1',
      automaticDealCreated: false,
      batches: [
        {
          batchId: 'batch-1',
          externalBatchId: 'connection-1:directory',
          qualificationRequired: true,
          linkedPersonIds: ['person-1'],
          linkedCompanyIds: ['company-1'],
          origin: { ...origin, source: 'SCRAPING', provider: null },
          counts: {
            total: 6,
            pending: 1,
            invalid: 1,
            duplicate: 1,
            suppressed: 1,
            conflict: 1,
            qualified: 1,
          },
        },
      ],
    });

    expect(state.kind).toBe('classified');
    expect(state.kind === 'classified' ? state.automaticDealCreated : null).toBe(
      false,
    );
    expect(state.kind === 'classified' ? state.deposits[0] : null).toEqual({
      batchId: 'batch-1',
      externalBatchId: 'connection-1:directory',
      origin: {
        source: 'scraping',
        provider: null,
        connectionId: 'connection-1',
        structureId: 'structure-1',
        eventId: 'event-42',
        receivedAt: '2026-10-30T12:00:00.000Z',
        attribution: 'verified',
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
      isQualificationRequired: true,
      linkedPersonIds: ['person-1'],
      linkedCompanyIds: ['company-1'],
    });
  });

  it('reads an unusable count as unknown rather than zero', () => {
    const state = readHermesScrapingClassification({
      automaticDealCreated: false,
      batches: [
        {
          batchId: 'batch-1',
          origin: {},
          counts: { total: 3, duplicate: null, suppressed: -1, conflict: 1.5 },
        },
      ],
    });

    // Reporting zero duplicates when the payload said nothing would be a claim
    // the server never made.
    expect(state.kind === 'classified' ? state.deposits[0].counts : null).toEqual(
      {
        total: 3,
        pending: null,
        invalid: null,
        duplicate: null,
        suppressed: null,
        conflict: null,
        qualified: null,
      },
    );
  });

  it('drops a deposit with no batch id instead of keeping a half-deposit', () => {
    const state = readHermesScrapingClassification({
      automaticDealCreated: false,
      batches: [{ origin: {}, counts: {} }, { batchId: 'batch-2', origin: {} }],
    });

    expect(
      state.kind === 'classified'
        ? state.deposits.map((deposit) => deposit.batchId)
        : null,
    ).toEqual(['batch-2']);
  });

  it('never reads an absent or unusable payload as an empty classification', () => {
    expect(readHermesScrapingClassification(undefined)).toEqual({
      kind: 'unreadable',
      problem: 'missing',
    });
    expect(readHermesScrapingClassification([])).toEqual({
      kind: 'unreadable',
      problem: 'not-an-object',
    });
    // A payload without a batches array is a shape this screen was not written
    // against: it is unreadable, not a company with no deposit.
    expect(readHermesScrapingClassification({ batches: null })).toEqual({
      kind: 'unreadable',
      problem: 'unexpected-shape',
    });
  });
});
