import {
  type HermesImportBatch,
  type HermesImportRow,
} from '@/prospection/types/HermesImportBatch';
import { isHermesImportRowStatus } from '@/prospection/types/HermesImportRowStatus';
import {
  type HermesCapabilities,
  type HermesImportState,
  type HermesPayloadRead,
} from '@/prospection/types/HermesImportState';
import {
  type HermesCampaignDraftResult,
  type HermesCreateImportBatchResult,
  type HermesQualifyImportRowsResult,
} from '@/prospection/types/HermesOperationResults';

// The four operations return GraphQLJSONObject: untyped JSON. Everything below
// reduces that payload field by field. A field that is absent or of the wrong
// type becomes null, and a payload whose shape or version does not match
// becomes 'unreadable' — never an empty result.

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
};

const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  // Non-string entries are dropped rather than stringified: a message the
  // client invented would read as a server message.
  return value.filter((entry): entry is string => typeof entry === 'string');
};

export const readHermesImportRow = (value: unknown): HermesImportRow | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const id = readString(value.id);

  // A row without an id cannot be qualified or drafted, so it is not kept as
  // a half-row. Callers count what they dropped.
  if (id === null) {
    return null;
  }

  const rawStatus = value.status;

  return {
    id,
    status: isHermesImportRowStatus(rawStatus) ? rawStatus : null,
    unknownStatus: isHermesImportRowStatus(rawStatus)
      ? null
      : typeof rawStatus === 'string'
        ? rawStatus
        : null,
    errors: readStringArray(value.errors),
    email: readString(value.email),
    companyName: readString(value.companyName),
    firstName: readString(value.firstName),
    lastName: readString(value.lastName),
    jobTitle: readString(value.jobTitle),
    website: readString(value.website),
    phone: readString(value.phone),
    personId: readString(value.personId),
    companyId: readString(value.companyId),
    hasQualification: isJsonObject(value.qualification),
  };
};

export const readHermesImportBatch = (
  value: unknown,
): HermesImportBatch | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const id = readString(value.id);

  if (id === null) {
    return null;
  }

  const rawRows = value.rows;
  const areRowsReadable = Array.isArray(rawRows);
  const readRows = areRowsReadable
    ? rawRows.map((row) => readHermesImportRow(row))
    : [];

  return {
    id,
    externalBatchId: readString(value.externalBatchId),
    fingerprint: readString(value.fingerprint),
    name: readString(value.name),
    sourceUrl: readString(value.sourceUrl),
    collectedAt: readString(value.collectedAt),
    createdAt: readString(value.createdAt),
    createdByUserId: readString(value.createdByUserId),
    rows: readRows.filter((row): row is HermesImportRow => row !== null),
    areRowsReadable,
    unreadableRowCount: readRows.filter((row) => row === null).length,
  };
};

const readHermesCapabilities = (value: unknown): HermesCapabilities => {
  const capabilities = isJsonObject(value) ? value : {};

  return {
    smtpCampaignSending: readBoolean(capabilities.smtpCampaignSending),
    trackingDefault: readBoolean(capabilities.trackingDefault),
    nativeCampaignDrafts: readBoolean(capabilities.nativeCampaignDrafts),
  };
};

// hermesImportBatches publishes version 1. Any other version is read as
// unknown: a shape this screen has not been written against must not be
// rendered as if it had been.
export const readHermesImportState = (
  payload: unknown,
): HermesPayloadRead<HermesImportState> => {
  if (payload === null || payload === undefined) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  if (!isJsonObject(payload)) {
    return { kind: 'unreadable', problem: 'not-an-object' };
  }

  if (payload.version !== 1) {
    return { kind: 'unreadable', problem: 'unsupported-version' };
  }

  if (!Array.isArray(payload.batches)) {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  const readBatches = payload.batches.map((batch) =>
    readHermesImportBatch(batch),
  );

  return {
    kind: 'read',
    value: {
      batches: readBatches.filter(
        (batch): batch is HermesImportBatch => batch !== null,
      ),
      campaignIds: readStringArray(payload.campaignIds),
      capabilities: readHermesCapabilities(payload.capabilities),
      unreadableBatchCount: readBatches.filter((batch) => batch === null)
        .length,
    },
  };
};

export const readHermesCreateImportBatchResult = (
  payload: unknown,
): HermesPayloadRead<HermesCreateImportBatchResult> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem: payload === null || payload === undefined
        ? 'missing'
        : 'not-an-object',
    };
  }

  return {
    kind: 'read',
    value: {
      batch: readHermesImportBatch(payload.batch),
      replay: readBoolean(payload.replay),
    },
  };
};

export const readHermesQualifyImportRowsResult = (
  payload: unknown,
): HermesPayloadRead<HermesQualifyImportRowsResult> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem: payload === null || payload === undefined
        ? 'missing'
        : 'not-an-object',
    };
  }

  const rawRows = payload.rows;

  return {
    kind: 'read',
    value: {
      batchId: readString(payload.batchId),
      rows: Array.isArray(rawRows)
        ? rawRows
            .map((row) => readHermesImportRow(row))
            .filter((row): row is HermesImportRow => row !== null)
        : null,
    },
  };
};

export const readHermesCampaignDraftResult = (
  payload: unknown,
): HermesPayloadRead<HermesCampaignDraftResult> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem: payload === null || payload === undefined
        ? 'missing'
        : 'not-an-object',
    };
  }

  return {
    kind: 'read',
    value: {
      campaignId: readString(payload.campaignId),
      listId: readString(payload.listId),
      // Only the contract's own value is accepted. Anything else is unknown,
      // and an unknown status is never presented as a finished draft.
      status: payload.status === 'DRAFT' ? 'DRAFT' : null,
      sendingAvailable: readBoolean(payload.sendingAvailable),
    },
  };
};
