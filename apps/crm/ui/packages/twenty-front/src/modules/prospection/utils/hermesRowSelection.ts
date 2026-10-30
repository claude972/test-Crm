import { type HermesImportRow } from '@/prospection/types/HermesImportBatch';

// Which rows the server will actually act on, kept out of the table component
// so the rule can be tested without rendering anything.
//
// The server skips invalid, duplicate and conflict rows on qualification, so
// offering them promised work that would never happen. A suppressed row is
// blocked outright, and a null status is outside the contract.
export const isHermesRowSelectable = (row: HermesImportRow): boolean =>
  row.status === 'pending' || row.status === 'qualified';

// Qualification acts on staged rows only. A qualified row stays selectable
// because it is what a campaign draft is built from, but it is not qualifiable
// again.
export const isHermesRowQualifiable = (row: HermesImportRow): boolean =>
  row.status === 'pending';
