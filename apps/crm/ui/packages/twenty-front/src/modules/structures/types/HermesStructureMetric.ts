import { type HermesStructureMetricStatus } from '@/structures/types/HermesStructureMetricStatus';

export type HermesStructureMetric = {
  key: string;
  // Null whenever the status is not AVAILABLE. Never coerce this to zero.
  value: number | null;
  status: HermesStructureMetricStatus;
};

export type HermesStructureMetricTotal = HermesStructureMetric & {
  contributingStructures: number;
  totalStructures: number;
};
