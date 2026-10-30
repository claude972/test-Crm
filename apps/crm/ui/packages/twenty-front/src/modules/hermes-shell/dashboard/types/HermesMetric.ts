// Why a status rather than a bare number: a count that could not be read must
// not reach the screen as 0. Each status below renders its own word, so the
// difference survives both a screenshot and a screen reader.
export type HermesMetricStatus =
  | 'available'
  | 'loading'
  | 'unauthorised'
  | 'unavailable'
  | 'notConfigured';

export type HermesMetric = {
  status: HermesMetricStatus;
  // Only ever set when status is 'available'. 0 here is a real zero.
  value: number | null;
};
