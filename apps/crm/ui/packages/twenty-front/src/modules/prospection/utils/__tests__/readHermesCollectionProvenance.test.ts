import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import { readHermesCollectionProvenance } from '@/prospection/utils/readHermesCollectionProvenance';

const buildBatch = (batch: Partial<HermesImportBatch>): HermesImportBatch => ({
  id: 'batch-1',
  externalBatchId: 'trade-show-2026-10',
  fingerprint: 'abcdef',
  name: 'Paris trade show',
  sourceUrl: 'https://example.org/directory',
  collectedAt: '2026-10-28T09:00:00.000Z',
  createdAt: '2026-10-28T09:05:00.000Z',
  createdByUserId: 'user-1',
  rows: [],
  areRowsReadable: true,
  unreadableRowCount: 0,
  ...batch,
});

describe('readHermesCollectionProvenance', () => {
  it('carries the provenance fields the published contract does declare', () => {
    expect(readHermesCollectionProvenance(buildBatch({}))).toEqual({
      originKind: null,
      originConnectionId: null,
      originReceivedAt: null,
      sourceUrl: 'https://example.org/directory',
      externalBatchId: 'trade-show-2026-10',
      fingerprint: 'abcdef',
      createdByUserId: 'user-1',
      collectedAt: '2026-10-28T09:00:00.000Z',
      createdAt: '2026-10-28T09:05:00.000Z',
    });
  });

  // The defect this guards against: calling a collection "manual" because the
  // manual form exists, or "automatic" because no actor was recorded. The
  // The origin is published now, but it is still never INFERRED: not from
  // the actor, not from a source URL, and not from any caller-supplied name.
  it('reads a signed intake as an automatic collection', () => {
    expect(
      readHermesCollectionProvenance(
        buildBatch({
          originKind: 'SIGNED_INTAKE',
          originConnectionId: 'connection-1',
          originReceivedAt: '2026-10-30T09:00:00.000Z',
        }),
      ).origin,
    ).toBe('automatic');
  });

  it('reads a manual deposit as such', () => {
    expect(
      readHermesCollectionProvenance(buildBatch({ originKind: 'MANUAL' }))
        .origin,
    ).toBe('manual-json');
  });

  // A batch staged before the server recorded an origin carries none. Absent
  // is unknown, and reading it as manual would blame an operator for a
  // collection nobody can attribute.
  it('leaves an absent origin unknown rather than manual', () => {
    expect(readHermesCollectionProvenance(buildBatch({})).origin).toBeNull();
  });

  it('refuses a kind outside the two published ones', () => {
    expect(
      readHermesCollectionProvenance(buildBatch({ originKind: 'WEBHOOK' }))
        .origin,
    ).toBeNull();
  });

  it('never infers an origin from the other provenance fields', () => {
    expect(
      readHermesCollectionProvenance(buildBatch({ createdByUserId: null }))
        .origin,
    ).toBeNull();
    expect(
      readHermesCollectionProvenance(buildBatch({ sourceUrl: null })).origin,
    ).toBeNull();
    expect(
      readHermesCollectionProvenance(
        buildBatch({ createdByUserId: 'user-2', sourceUrl: null }),
      ).origin,
    ).toBeNull();
  });

  it('keeps an unreadable provenance field null rather than blank', () => {
    const provenance = readHermesCollectionProvenance(
      buildBatch({ fingerprint: null, collectedAt: null }),
    );

    expect(provenance.fingerprint).toBeNull();
    expect(provenance.collectedAt).toBeNull();
  });
});
