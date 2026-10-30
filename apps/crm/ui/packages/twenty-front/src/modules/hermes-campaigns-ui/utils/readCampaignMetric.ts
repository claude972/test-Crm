import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCampaignMetric,
  type HermesCampaignMetricReading,
} from '@/hermes-campaigns-ui/types/HermesCampaignResult';

// Reads one result figure. Unknown is not zero: a missing figure, and one
// that is not a whole non-negative count, both read as unknown, while a
// published 0 reads as the figure 0.
export const readCampaignMetric = (
  metric: HermesCampaignMetric,
): HermesCampaignMetricReading => {
  const { value } = metric;

  if (
    isDefined(value) &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return { kind: 'known', value };
  }

  if (!isDefined(value)) {
    return { kind: 'unknown', reason: metric.unknownReason ?? 'not-published' };
  }

  // Something was published and it was not a count. Saying so is better than
  // rounding it to a number the server never gave.
  return { kind: 'unknown', reason: 'unreadable' };
};
