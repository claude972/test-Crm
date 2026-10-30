import { type HermesStructureDashboard } from '@/structures/types/HermesStructureDashboard';

// Which metric columns the table draws.
//
// The contract carries totals and per-structure metrics as two separate arrays
// and does not promise the same keys in both. Taking the columns from the
// totals alone meant a metric a structure reported, but that had no total, was
// never drawn — present in the answer and invisible on screen.
//
// The order is the server's own ordering of the totals first, so the familiar
// columns stay where they were, then any further key a structure reported, in
// the order first seen.
export const buildStructureMetricColumns = (
  dashboard: Pick<HermesStructureDashboard, 'totals' | 'structures'>,
): string[] => {
  const keys = dashboard.totals.map((total) => total.key);
  const seen = new Set(keys);

  for (const row of dashboard.structures) {
    for (const metric of row.metrics) {
      if (!seen.has(metric.key)) {
        seen.add(metric.key);
        keys.push(metric.key);
      }
    }
  }

  return keys;
};
