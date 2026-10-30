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
      origin: null,
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
  // published contract tells the two apart nowhere, so the origin stays
  // unknown whatever the other fields say.
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
