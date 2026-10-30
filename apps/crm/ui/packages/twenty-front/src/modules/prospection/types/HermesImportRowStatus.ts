// The six row statuses of docs/handoff/hermes-prospection-backend-contract.md,
// and nothing else. A payload carrying any other value is an unknown status,
// never the closest-looking one of these.
export const HERMES_IMPORT_ROW_STATUSES = [
  'pending',
  'invalid',
  'duplicate',
  'suppressed',
  'qualified',
  'conflict',
] as const;

export type HermesImportRowStatus = (typeof HERMES_IMPORT_ROW_STATUSES)[number];

export const isHermesImportRowStatus = (
  value: unknown,
): value is HermesImportRowStatus =>
  typeof value === 'string' &&
  (HERMES_IMPORT_ROW_STATUSES as readonly string[]).includes(value);
