import { type HermesAudienceExclusion } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import { aggregateAudienceExclusions } from '@/hermes-campaigns-ui/utils/aggregateAudienceExclusions';

const exclusion = (
  exclusionPart: Partial<HermesAudienceExclusion>,
): HermesAudienceExclusion => ({
  reason: 'marketing-objection',
  unknownReason: null,
  count: 1,
  ...exclusionPart,
});

describe('aggregateAudienceExclusions', () => {
  it('reports an exact zero when the server published no exclusion', () => {
    const aggregate = aggregateAudienceExclusions([]);

    expect(aggregate.rows).toEqual([]);
    expect(aggregate.total).toEqual({ kind: 'exact', value: 0 });
    expect(aggregate.unknownReasonEntryCount).toBe(0);
  });

  it('keeps the four reasons in the order of the contract', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'incomplete-qualification', count: 4 }),
      exclusion({ reason: 'invalid-address', count: 1 }),
      exclusion({ reason: 'marketing-objection', count: 3 }),
      exclusion({ reason: 'resolved-duplicate', count: 2 }),
    ]);

    expect(aggregate.rows.map((row) => row.reason)).toEqual([
      'marketing-objection',
      'resolved-duplicate',
      'invalid-address',
      'incomplete-qualification',
    ]);
    expect(aggregate.total).toEqual({ kind: 'exact', value: 10 });
  });

  it('folds several entries of the same reason into one row', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'invalid-address', count: 2 }),
      exclusion({ reason: 'invalid-address', count: 5 }),
    ]);

    expect(aggregate.rows).toHaveLength(1);
    expect(aggregate.rows[0]?.count).toEqual({ kind: 'exact', value: 7 });
  });

  // A known zero is an answer. It must survive the fold.
  it('keeps a known zero as a zero', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'marketing-objection', count: 0 }),
    ]);

    expect(aggregate.rows[0]?.count).toEqual({ kind: 'exact', value: 0 });
    expect(aggregate.total).toEqual({ kind: 'exact', value: 0 });
  });

  // And an unreadable count must never become one.
  it('reports an unreadable count as unknown, not as zero', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'marketing-objection', count: null }),
    ]);

    expect(aggregate.rows[0]?.count).toEqual({
      kind: 'unknown',
      unreadableEntryCount: 1,
    });
    expect(aggregate.total).toEqual({
      kind: 'unknown',
      unreadableEntryCount: 1,
    });
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats %p as unreadable rather than coercing it',
    (count) => {
      const aggregate = aggregateAudienceExclusions([
        exclusion({ reason: 'invalid-address', count }),
      ]);

      expect(aggregate.rows[0]?.count).toEqual({
        kind: 'unknown',
        unreadableEntryCount: 1,
      });
    },
  );

  it('marks a row partial when only some of its entries could be read', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'resolved-duplicate', count: 3 }),
      exclusion({ reason: 'resolved-duplicate', count: null }),
    ]);

    expect(aggregate.rows[0]?.count).toEqual({
      kind: 'partial',
      value: 3,
      unreadableEntryCount: 1,
    });
  });

  it('marks the total partial when any reason could not be fully added', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'marketing-objection', count: 3 }),
      exclusion({ reason: 'invalid-address', count: null }),
    ]);

    expect(aggregate.total).toEqual({
      kind: 'partial',
      value: 3,
      unreadableEntryCount: 1,
    });
  });

  it('keeps a reason outside the contract apart, with its raw code', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'marketing-objection', count: 1 }),
      exclusion({ reason: null, unknownReason: 'HARD_BOUNCE', count: 2 }),
    ]);

    expect(aggregate.rows).toHaveLength(2);
    expect(aggregate.rows[1]).toMatchObject({
      reason: null,
      unknownReason: 'HARD_BOUNCE',
      count: { kind: 'exact', value: 2 },
    });
    expect(aggregate.unknownReasonEntryCount).toBe(1);
    // It still counts towards the total: those records were excluded too.
    expect(aggregate.total).toEqual({ kind: 'exact', value: 3 });
  });

  it('groups two entries of the same unknown reason together', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: null, unknownReason: 'HARD_BOUNCE', count: 1 }),
      exclusion({ reason: null, unknownReason: ' HARD_BOUNCE ', count: 2 }),
    ]);

    expect(aggregate.rows).toHaveLength(1);
    expect(aggregate.rows[0]?.count).toEqual({ kind: 'exact', value: 3 });
    expect(aggregate.unknownReasonEntryCount).toBe(2);
  });

  it('does not invent a row for a reason the server never published', () => {
    const aggregate = aggregateAudienceExclusions([
      exclusion({ reason: 'invalid-address', count: 1 }),
    ]);

    expect(aggregate.rows.map((row) => row.reason)).toEqual([
      'invalid-address',
    ]);
  });
});
