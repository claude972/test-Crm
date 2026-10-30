import {
  HERMES_IMPORT_ROW_FIELDS,
  HERMES_MAX_ROWS_PER_BATCH,
  HERMES_MAX_STATE_BYTES,
} from '@/prospection/constants/HermesContractLimits';
import {
  type HermesCreateImportBatchInput,
  type HermesImportRowInput,
} from '@/prospection/types/HermesImportInput';
import { type HermesInputIssue } from '@/prospection/types/HermesInputIssue';

// Every bound checked here is written in the contract. They are checked before
// the call so the screen can name the rule instead of relaying a server error.

export type HermesImportBatchFormValues = {
  externalBatchId: string;
  name: string;
  sourceUrl: string;
  // Value of a datetime-local control, in the browser's own time zone. It is
  // converted to an ISO8601 instant below, and the screen shows what it sends.
  collectedAtLocal: string;
  rowsText: string;
};

export type HermesImportBatchValidation = {
  // Null as long as one check fails: no partially valid input is ever sent.
  input: HermesCreateImportBatchInput | null;
  issues: HermesInputIssue[];
  // The instant that would be sent, so the form can show it next to the field.
  collectedAt: string | null;
  rowCount: number | null;
  // Serialised size of the input, measured against the 2 MB state bound.
  inputByteLength: number | null;
};

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const toHermesCollectedAt = (collectedAtLocal: string): string | null => {
  if (collectedAtLocal.trim().length === 0) {
    return null;
  }

  const parsed = new Date(collectedAtLocal);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

// http(s) only, and no credentials in the URL: both are contract rules on
// sourceUrl.
const readSourceUrlIssue = (
  sourceUrl: string,
): HermesInputIssue['code'] | null => {
  let parsed: URL;

  try {
    parsed = new URL(sourceUrl);
  } catch {
    return 'source-url-not-http';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'source-url-not-http';
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return 'source-url-has-credentials';
  }

  return null;
};

type ReadRowsResult = {
  rows: HermesImportRowInput[] | null;
  issues: HermesInputIssue[];
};

// Accepts a pasted array of rows, or an object carrying a rows array, and
// nothing else. Unknown fields are reported rather than dropped: the server
// rejects them, so silently stripping them would send something other than
// what was pasted.
export const readHermesImportRowsText = (rowsText: string): ReadRowsResult => {
  const trimmed = rowsText.trim();

  if (trimmed.length === 0) {
    return { rows: null, issues: [{ key: 'rows', code: 'rows-required' }] };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { rows: null, issues: [{ key: 'rows', code: 'rows-not-json' }] };
  }

  const rawRows = Array.isArray(parsed)
    ? parsed
    : isJsonObject(parsed) && Array.isArray(parsed.rows)
      ? parsed.rows
      : null;

  if (rawRows === null) {
    return { rows: null, issues: [{ key: 'rows', code: 'rows-not-array' }] };
  }

  if (rawRows.length === 0) {
    return { rows: null, issues: [{ key: 'rows', code: 'rows-required' }] };
  }

  const issues: HermesInputIssue[] = [];

  if (rawRows.length > HERMES_MAX_ROWS_PER_BATCH) {
    issues.push({
      key: 'rows-too-many',
      code: 'rows-too-many',
      count: rawRows.length,
      limit: HERMES_MAX_ROWS_PER_BATCH,
    });
  }

  const rows: HermesImportRowInput[] = [];

  rawRows.forEach((rawRow, index) => {
    const row = index + 1;

    if (!isJsonObject(rawRow)) {
      issues.push({ key: `row-${row}-shape`, code: 'row-not-an-object', row });
      return;
    }

    for (const field of Object.keys(rawRow)) {
      if (!(HERMES_IMPORT_ROW_FIELDS as readonly string[]).includes(field)) {
        issues.push({
          key: `row-${row}-unknown-${field}`,
          code: 'row-unknown-field',
          row,
          field,
        });
      }
    }

    const readField = (field: string): string | null => {
      const value = rawRow[field];

      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value !== 'string') {
        issues.push({
          key: `row-${row}-type-${field}`,
          code: 'row-field-not-a-string',
          row,
          field,
        });
        return null;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : null;
    };

    const email = readField('email');
    const companyName = readField('companyName');
    const firstName = readField('firstName');
    const lastName = readField('lastName');
    const jobTitle = readField('jobTitle');
    const website = readField('website');
    const phone = readField('phone');

    if (companyName === null) {
      issues.push({
        key: `row-${row}-company`,
        code: 'row-company-required',
        row,
      });
    }

    // An empty email does NOT block the batch. The contract is explicit that
    // rows are staged even when their email validation fails, with the error
    // returned per row, so refusing it here would hide a row the server would
    // have kept and marked invalid.
    if (companyName === null) {
      return;
    }

    // Only the fields the input type declares travel, and an absent optional
    // field is left out rather than sent as an empty string.
    rows.push({
      email: email ?? '',
      companyName,
      ...(firstName !== null ? { firstName } : {}),
      ...(lastName !== null ? { lastName } : {}),
      ...(jobTitle !== null ? { jobTitle } : {}),
      ...(website !== null ? { website } : {}),
      ...(phone !== null ? { phone } : {}),
    });
  });

  return { rows: issues.length > 0 ? null : rows, issues };
};

export const validateHermesImportBatchInput = ({
  externalBatchId,
  name,
  sourceUrl,
  collectedAtLocal,
  rowsText,
}: HermesImportBatchFormValues): HermesImportBatchValidation => {
  const issues: HermesInputIssue[] = [];

  const trimmedExternalBatchId = externalBatchId.trim();
  const trimmedName = name.trim();
  const trimmedSourceUrl = sourceUrl.trim();

  if (trimmedExternalBatchId.length === 0) {
    issues.push({
      key: 'external-batch-id',
      code: 'external-batch-id-required',
    });
  }

  if (trimmedName.length === 0) {
    issues.push({ key: 'batch-name', code: 'batch-name-required' });
  }

  if (trimmedSourceUrl.length === 0) {
    issues.push({ key: 'source-url', code: 'source-url-required' });
  } else {
    const sourceUrlIssue = readSourceUrlIssue(trimmedSourceUrl);

    if (sourceUrlIssue !== null) {
      issues.push({ key: 'source-url', code: sourceUrlIssue });
    }
  }

  const collectedAt = toHermesCollectedAt(collectedAtLocal);

  if (collectedAtLocal.trim().length === 0) {
    issues.push({ key: 'collected-at', code: 'collected-at-required' });
  } else if (collectedAt === null) {
    issues.push({ key: 'collected-at', code: 'collected-at-not-iso' });
  }

  const { rows, issues: rowIssues } = readHermesImportRowsText(rowsText);

  issues.push(...rowIssues);

  const isComplete =
    rows !== null &&
    collectedAt !== null &&
    trimmedExternalBatchId.length > 0 &&
    trimmedName.length > 0 &&
    trimmedSourceUrl.length > 0;

  if (!isComplete) {
    return {
      input: null,
      issues,
      collectedAt,
      rowCount: rows?.length ?? null,
      inputByteLength: null,
    };
  }

  const input: HermesCreateImportBatchInput = {
    externalBatchId: trimmedExternalBatchId,
    name: trimmedName,
    sourceUrl: trimmedSourceUrl,
    collectedAt,
    rows,
  };

  // The 2 MB bound is on the stored state, so the client measures what it is
  // about to add to it rather than guessing.
  const inputByteLength = new TextEncoder().encode(JSON.stringify(input)).length;

  if (inputByteLength > HERMES_MAX_STATE_BYTES) {
    issues.push({
      key: 'state-too-large',
      code: 'state-too-large',
      count: inputByteLength,
      limit: HERMES_MAX_STATE_BYTES,
    });
  }

  return {
    input: issues.length > 0 ? null : input,
    issues,
    collectedAt,
    rowCount: rows.length,
    inputByteLength,
  };
};
