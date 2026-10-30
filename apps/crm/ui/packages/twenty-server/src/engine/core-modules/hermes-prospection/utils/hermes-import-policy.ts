import { createHash, randomUUID } from 'node:crypto';

import {
  type HermesImportBatch,
  type HermesImportSourceRow,
  type HermesProspectionState,
} from 'src/engine/core-modules/hermes-prospection/types/hermes-prospection.types';

export const HERMES_IMPORT_LIMITS = {
  batches: 40,
  rowsPerBatch: 100,
  campaigns: 100,
  stateBytes: 2_000_000,
} as const;

export const normalizeHermesEmail = (email: string): string =>
  email.trim().toLowerCase();

export const emptyHermesProspectionState = (): HermesProspectionState => ({
  version: 1,
  batches: [],
  campaignIds: [],
});

export const isHermesSourceUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      value.length <= 2048
    );
  } catch {
    return false;
  }
};

export const buildHermesImportBatch = ({
  externalBatchId,
  name,
  sourceUrl,
  collectedAt,
  rows,
  userId,
  now,
}: {
  externalBatchId: string;
  name: string;
  sourceUrl: string;
  collectedAt: string;
  rows: HermesImportSourceRow[];
  userId: string;
  now: string;
}): HermesImportBatch => {
  const canonicalRows = rows.map((row) => ({
    email: normalizeHermesEmail(row.email),
    companyName: row.companyName.trim(),
    firstName: row.firstName?.trim() ?? '',
    lastName: row.lastName?.trim() ?? '',
    jobTitle: row.jobTitle?.trim() ?? '',
    website: row.website?.trim() ?? '',
    phone: row.phone?.trim() ?? '',
  }));
  const seen = new Set<string>();

  return {
    id: randomUUID(),
    externalBatchId,
    fingerprint: createHash('sha256')
      .update(JSON.stringify({ sourceUrl, collectedAt, rows: canonicalRows }))
      .digest('hex'),
    name,
    sourceUrl,
    collectedAt,
    createdAt: now,
    createdByUserId: userId,
    rows: canonicalRows.map((row) => {
      const errors: string[] = [];

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
        row.email.length > 254
      ) {
        errors.push('invalid_email');
      }
      if (!row.companyName) errors.push('company_name_required');
      if (row.website && !isHermesSourceUrl(row.website))
        errors.push('invalid_website');
      const duplicate = seen.has(row.email);

      seen.add(row.email);

      return {
        ...row,
        id: randomUUID(),
        status: errors.length ? 'invalid' : duplicate ? 'duplicate' : 'pending',
        errors,
      };
    }),
  };
};

export const claimHermesImportBatch = (
  state: HermesProspectionState,
  batch: HermesImportBatch,
): { batch: HermesImportBatch; replay: boolean } => {
  const previous = state.batches.find(
    (item) => item.externalBatchId === batch.externalBatchId,
  );

  if (previous) {
    if (previous.fingerprint !== batch.fingerprint) {
      throw new Error('EXTERNAL_BATCH_ID_CONTENT_CONFLICT');
    }

    return { batch: previous, replay: true };
  }
  if (state.batches.length >= HERMES_IMPORT_LIMITS.batches) {
    throw new Error('IMPORT_BATCH_LIMIT_REACHED');
  }
  state.batches.push(batch);

  return { batch, replay: false };
};
