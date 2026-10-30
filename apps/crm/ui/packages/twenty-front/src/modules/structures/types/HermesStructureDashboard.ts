import { type HermesAuthorizedStructure } from '@/structures/types/HermesAuthorizedStructure';
import {
  type HermesStructureMetric,
  type HermesStructureMetricTotal,
} from '@/structures/types/HermesStructureMetric';

export type HermesStructureDashboardRow = {
  structure: HermesAuthorizedStructure;
  metrics: HermesStructureMetric[];
};

export type HermesStructureDashboard = {
  generatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  // True as soon as one expected metric is not available, so the totals below
  // cover only the structures that answered.
  partial: boolean;
  structures: HermesStructureDashboardRow[];
  totals: HermesStructureMetricTotal[];
};
