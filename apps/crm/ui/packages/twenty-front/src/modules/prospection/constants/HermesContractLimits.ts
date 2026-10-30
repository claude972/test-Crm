// Every bound below is written in docs/handoff/hermes-prospection-backend-contract.md
// and is enforced client side before the call, so a refusal reads as a rule
// rather than as a server error.
export const HERMES_MAX_ROWS_PER_BATCH = 100;
export const HERMES_MAX_RETAINED_BATCHES = 40;
export const HERMES_MAX_STATE_BYTES = 2 * 1024 * 1024;
export const HERMES_MAX_QUALIFY_ROW_IDS = 100;
export const HERMES_MAX_DRAFT_ROW_IDS = 100;
export const HERMES_PURPOSE_MIN_LENGTH = 8;
export const HERMES_PURPOSE_MAX_LENGTH = 1000;

// HermesCreateImportBatchInput rows carry these fields and no others: the
// server rejects unknown fields, so a pasted extra field is reported here.
export const HERMES_IMPORT_ROW_REQUIRED_FIELDS = ['email', 'companyName'] as const;

export const HERMES_IMPORT_ROW_OPTIONAL_FIELDS = [
  'firstName',
  'lastName',
  'jobTitle',
  'website',
  'phone',
] as const;

export const HERMES_IMPORT_ROW_FIELDS = [
  ...HERMES_IMPORT_ROW_REQUIRED_FIELDS,
  ...HERMES_IMPORT_ROW_OPTIONAL_FIELDS,
] as const;
