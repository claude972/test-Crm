import { type HermesImportBatch } from '@/prospection/types/HermesImportBatch';
import {
  HERMES_IMPORT_ROW_STATUSES,
  type HermesImportRowStatus,
} from '@/prospection/types/HermesImportRowStatus';
import { type HermesImportState } from '@/prospection/types/HermesImportState';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import {
  buildCoveredProspectionCount,
  exactProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';

// Figures derived from a payload that was read defensively. A batch whose rows
// could not be read contributes nothing and makes the figure unavailable or
// partial — never a zero.

export type HermesBatchCounts = {
  rows: ProspectionCount;
  byStatus: Record<HermesImportRowStatus, ProspectionCount>;
  unknownStatus: ProspectionCount;
};

export const buildHermesBatchCounts = (
  batch: HermesImportBatch,
): HermesBatchCounts => {
  if (!batch.areRowsReadable) {
    const unavailable = unavailableProspectionCount();

    return {
      rows: unavailable,
      byStatus: Object.fromEntries(
        HERMES_IMPORT_ROW_STATUSES.map((status) => [status, unavailable]),
      ) as Record<HermesImportRowStatus, ProspectionCount>,
      unknownStatus: unavailable,
    };
  }

  const covered = batch.rows.length;
  const total = covered + batch.unreadableRowCount;

  const countOver = (value: number): ProspectionCount =>
    buildCoveredProspectionCount({ value, covered, total });

  return {
    rows:
      batch.unreadableRowCount > 0
        ? buildCoveredProspectionCount({ value: covered, covered, total })
        : exactProspectionCount(covered),
    byStatus: Object.fromEntries(
      HERMES_IMPORT_ROW_STATUSES.map((status) => [
        status,
        countOver(batch.rows.filter((row) => row.status === status).length),
      ]),
    ) as Record<HermesImportRowStatus, ProspectionCount>,
    unknownStatus: countOver(
      batch.rows.filter((row) => row.status === null).length,
    ),
  };
};

export type HermesStateCounts = {
  batches: ProspectionCount;
  rows: ProspectionCount;
  qualifiedRows: ProspectionCount;
  suppressedRows: ProspectionCount;
};

export const buildHermesStateCounts = (
  state: HermesImportState,
): HermesStateCounts => {
  const readableBatches = state.batches.filter(
    (batch) => batch.areRowsReadable,
  );
  const totalBatches = state.batches.length + state.unreadableBatchCount;
  const rowsOfReadableBatches = readableBatches.flatMap((batch) => batch.rows);
  const unreadableRowCount = readableBatches.reduce(
    (total, batch) => total + batch.unreadableRowCount,
    0,
  );

  // A row figure is exact only when every batch, and every row of every batch,
  // could be read. Otherwise it is partial without a denominator: counting
  // batches would be a denominator in the wrong unit.
  const areAllRowsCovered =
    readableBatches.length === state.batches.length &&
    state.unreadableBatchCount === 0 &&
    unreadableRowCount === 0;

  const countRows = (value: number): ProspectionCount =>
    areAllRowsCovered
      ? exactProspectionCount(value)
      : { status: 'partial', value };

  return {
    batches:
      state.unreadableBatchCount > 0
        ? buildCoveredProspectionCount({
            value: state.batches.length,
            covered: state.batches.length,
            total: totalBatches,
          })
        : exactProspectionCount(state.batches.length),
    rows: countRows(rowsOfReadableBatches.length),
    qualifiedRows: countRows(
      rowsOfReadableBatches.filter((row) => row.status === 'qualified').length,
    ),
    suppressedRows: countRows(
      rowsOfReadableBatches.filter((row) => row.status === 'suppressed').length,
    ),
  };
};
