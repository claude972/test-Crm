import {
  buildHermesImportBatch,
  claimHermesImportBatch,
  emptyHermesProspectionState,
  HERMES_IMPORT_LIMITS,
  isHermesSourceUrl,
} from 'src/engine/core-modules/hermes-prospection/utils/hermes-import-policy';

const makeBatch = (
  overrides: Partial<Parameters<typeof buildHermesImportBatch>[0]> = {},
) =>
  buildHermesImportBatch({
    externalBatchId: 'synthetic-batch-1',
    name: 'Synthetic B2B fixture',
    sourceUrl: 'https://example.test/business-directory',
    collectedAt: '2026-10-29T12:00:00Z',
    userId: 'synthetic-user',
    now: '2026-10-29T12:05:00Z',
    rows: [
      { email: ' Person@Example.test ', companyName: ' Example Company ' },
    ],
    ...overrides,
  });

describe('Hermes import policy', () => {
  it('normalizes identities and flags repeated emails without auto qualification', () => {
    const batch = makeBatch({
      rows: [
        { email: ' Person@Example.test ', companyName: ' Example Company ' },
        { email: 'person@example.test', companyName: 'Other Company' },
        { email: 'not-an-email', companyName: '' },
      ],
    });

    expect(batch.rows.map((row) => row.status)).toEqual([
      'pending',
      'duplicate',
      'invalid',
    ]);
    expect(batch.rows[0].email).toBe('person@example.test');
    expect(batch.rows[0].companyName).toBe('Example Company');
    expect(batch.rows[2].errors).toEqual([
      'invalid_email',
      'company_name_required',
    ]);
  });

  it('replays identical source batches without adding rows or changing their IDs', () => {
    const state = emptyHermesProspectionState();
    const first = claimHermesImportBatch(state, makeBatch());
    const second = claimHermesImportBatch(
      state,
      makeBatch({
        rows: [
          { email: 'person@example.test', companyName: 'Example Company' },
        ],
      }),
    );

    expect(second.replay).toBe(true);
    expect(second.batch.id).toBe(first.batch.id);
    expect(state.batches).toHaveLength(1);
  });

  it('rejects reuse of an external batch ID with different content', () => {
    const state = emptyHermesProspectionState();

    claimHermesImportBatch(state, makeBatch());
    expect(() =>
      claimHermesImportBatch(
        state,
        makeBatch({
          rows: [{ email: 'other@example.test', companyName: 'Other Company' }],
        }),
      ),
    ).toThrow('EXTERNAL_BATCH_ID_CONTENT_CONFLICT');
    expect(state.batches).toHaveLength(1);
  });

  it('keeps workspace states independent even when external IDs match', () => {
    const workspaceA = emptyHermesProspectionState();
    const workspaceB = emptyHermesProspectionState();

    claimHermesImportBatch(workspaceA, makeBatch());
    const result = claimHermesImportBatch(
      workspaceB,
      makeBatch({
        rows: [{ email: 'b@example.test', companyName: 'B Company' }],
      }),
    );

    expect(result.replay).toBe(false);
    expect(workspaceA.batches[0].rows[0].email).toBe('person@example.test');
  });

  it('bounds retained batches while allowing safe retries at the limit', () => {
    const state = emptyHermesProspectionState();

    for (let index = 0; index < HERMES_IMPORT_LIMITS.batches; index++) {
      claimHermesImportBatch(
        state,
        makeBatch({ externalBatchId: `batch-${index}` }),
      );
    }
    expect(
      claimHermesImportBatch(state, makeBatch({ externalBatchId: 'batch-0' }))
        .replay,
    ).toBe(true);
    expect(() => claimHermesImportBatch(state, makeBatch())).toThrow(
      'IMPORT_BATCH_LIMIT_REACHED',
    );
  });

  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:password@example.test',
    'not a URL',
  ])('rejects unsafe source metadata %s without fetching it', (url) =>
    expect(isHermesSourceUrl(url)).toBe(false),
  );
});
