import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesAudienceExclusion,
  type HermesAudienceExclusionAggregate,
  type HermesAudienceExclusionReason,
  type HermesAudienceExclusionRow,
  type HermesCampaignCountSummary,
} from '@/hermes-campaigns-ui/types/HermesCampaignAudience';

// The order of the contract, which is also the order the rows are shown in,
// so the table does not reshuffle itself between two reads.
export const HERMES_AUDIENCE_EXCLUSION_REASONS: readonly HermesAudienceExclusionReason[] =
  [
    'marketing-objection',
    'resolved-duplicate',
    'invalid-address',
    'incomplete-qualification',
  ];

const isUsableCount = (count: number | null): count is number =>
  isDefined(count) &&
  Number.isInteger(count) &&
  Number.isFinite(count) &&
  count >= 0;

type Bucket = {
  key: string;
  reason: HermesAudienceExclusionReason | null;
  unknownReason: string | null;
  knownTotal: number;
  readableEntryCount: number;
  unreadableEntryCount: number;
};

const summariseBucket = (bucket: Bucket): HermesCampaignCountSummary => {
  if (bucket.readableEntryCount === 0) {
    return {
      kind: 'unknown',
      unreadableEntryCount: bucket.unreadableEntryCount,
    };
  }

  if (bucket.unreadableEntryCount > 0) {
    return {
      kind: 'partial',
      value: bucket.knownTotal,
      unreadableEntryCount: bucket.unreadableEntryCount,
    };
  }

  return { kind: 'exact', value: bucket.knownTotal };
};

// Folds the published exclusions into one row per reason: entries sharing a
// reason add up instead of appearing twice, a known zero stays a zero, an
// unreadable count never becomes one, and a sum that could not add every
// entry says so rather than passing a short total off as the whole.
export const aggregateAudienceExclusions = (
  exclusions: HermesAudienceExclusion[],
): HermesAudienceExclusionAggregate => {
  const buckets = new Map<string, Bucket>();

  for (const exclusion of exclusions) {
    const unknownReason = isDefined(exclusion.reason)
      ? null
      : (exclusion.unknownReason?.trim() ?? null);

    // Reasons outside the contract are kept apart by their raw code, and the
    // ones that carried no code at all share one bucket: they are all "a
    // reason this build does not know".
    const key = isDefined(exclusion.reason)
      ? `reason:${exclusion.reason}`
      : `unknown:${unknownReason ?? ''}`;

    const bucket = buckets.get(key) ?? {
      key,
      reason: exclusion.reason,
      unknownReason,
      knownTotal: 0,
      readableEntryCount: 0,
      unreadableEntryCount: 0,
    };

    if (isUsableCount(exclusion.count)) {
      bucket.knownTotal += exclusion.count;
      bucket.readableEntryCount += 1;
    } else {
      bucket.unreadableEntryCount += 1;
    }

    buckets.set(key, bucket);
  }

  const contractBuckets = HERMES_AUDIENCE_EXCLUSION_REASONS.map((reason) =>
    buckets.get(`reason:${reason}`),
  ).filter((bucket): bucket is Bucket => isDefined(bucket));

  const otherBuckets = [...buckets.values()].filter(
    (bucket) => !isDefined(bucket.reason),
  );

  const orderedBuckets = [...contractBuckets, ...otherBuckets];

  const rows: HermesAudienceExclusionRow[] = orderedBuckets.map((bucket) => ({
    key: bucket.key,
    reason: bucket.reason,
    unknownReason: bucket.unknownReason,
    count: summariseBucket(bucket),
  }));

  const knownTotal = orderedBuckets.reduce(
    (total, bucket) => total + bucket.knownTotal,
    0,
  );
  const readableEntryCount = orderedBuckets.reduce(
    (total, bucket) => total + bucket.readableEntryCount,
    0,
  );
  const unreadableEntryCount = orderedBuckets.reduce(
    (total, bucket) => total + bucket.unreadableEntryCount,
    0,
  );

  // No exclusion at all is an exact zero: the server answered, and its answer
  // was that nothing was excluded.
  const total: HermesCampaignCountSummary =
    exclusions.length === 0
      ? { kind: 'exact', value: 0 }
      : readableEntryCount === 0
        ? { kind: 'unknown', unreadableEntryCount }
        : unreadableEntryCount > 0
          ? { kind: 'partial', value: knownTotal, unreadableEntryCount }
          : { kind: 'exact', value: knownTotal };

  return {
    rows,
    total,
    unknownReasonEntryCount: otherBuckets.reduce(
      (count, bucket) =>
        count + bucket.readableEntryCount + bucket.unreadableEntryCount,
      0,
    ),
  };
};
