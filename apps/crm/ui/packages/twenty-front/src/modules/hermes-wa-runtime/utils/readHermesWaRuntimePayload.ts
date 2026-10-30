import {
  type MessagingInboxPage,
  type MessagingInboxPayloadRead,
} from '@/messaging-inbox/types/MessagingInboxPage';
import { readMessagingInboxMessage } from '@/messaging-inbox/utils/readMessagingInboxPayload';

import { type HermesWaRuntimeAsset } from '@/hermes-wa-runtime/types/HermesWaRuntimeAsset';
import {
  type HermesWaRuntimeMessage,
  readHermesWaMessageKind,
} from '@/hermes-wa-runtime/types/HermesWaRuntimeMessage';
import {
  type HermesWaMediaReadTarget,
  type HermesWaUploadTarget,
} from '@/hermes-wa-runtime/types/HermesWaUploadTarget';

// The V4 media and V3 messaging operations are absent from the generated
// schema, so nothing type-checks their payloads at compile time — and the
// contract sends `kind`, `status` and every other vocabulary as a String, so
// even a generated DTO would carry sets this client cannot assume are closed.
//
// So every answer is reduced field by field, on the same three rules the inbox
// already uses: a field that is absent or of the wrong type becomes null, a
// value outside a published set is kept verbatim, and a payload whose shape
// does not match the contract becomes 'unreadable' — never an empty list and
// never a success.

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

// A byte count. A non-finite or negative number is not repaired into one: it
// becomes null, and the library then shows no size rather than "0 KB", which
// next to a filename reads as a broken upload.
const readByteSize = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;

// One `HermesMediaAsset`. An asset without a readable id is dropped: the id is
// the only thing that can read the bytes back or attach them to a send, so a
// half-entry would be an attachment nobody can open.
export const readHermesWaRuntimeAsset = (
  value: unknown,
): HermesWaRuntimeAsset | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const id = readString(value.id);

  if (id === null) {
    return null;
  }

  return {
    id,
    rawKind: readString(value.kind),
    filename: readString(value.filename),
    mimeType: readString(value.mimeType),
    byteSize: readByteSize(value.size),
    rawStatus: readString(value.status),
  };
};

// One `HermesInboxMessageV3`.
//
// The V1 half goes through the inbox's own reader, so `status`, `direction` and
// `errorCode` keep exactly one meaning across both screens. A message the V1
// reader refuses — no id — is refused here too.
export const readHermesWaRuntimeMessage = (
  value: unknown,
): HermesWaRuntimeMessage | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const base = readMessagingInboxMessage(value);

  if (base === null) {
    return null;
  }

  const rawAttachments = value.attachments;

  // `attachments` is non-null in the contract. An answer that omits it, or
  // sends something that is not a list, is read as no attachments rather than
  // as a malformed message: the text half is still real and still worth
  // showing, and the gap is counted below.
  const readAttachments = Array.isArray(rawAttachments)
    ? rawAttachments.map((entry) => readHermesWaRuntimeAsset(entry))
    : [];

  return {
    base,
    kind: readHermesWaMessageKind(value.kind),
    attachments: readAttachments.filter(
      (entry): entry is HermesWaRuntimeAsset => entry !== null,
    ),
    unreadableAttachmentCount: readAttachments.filter(
      (entry) => entry === null,
    ).length,
  };
};

export const readHermesWaRuntimeMessagePage = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxPage<HermesWaRuntimeMessage>> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const rawItems = value.items;

  if (!Array.isArray(rawItems)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const readItems = rawItems.map((item) => readHermesWaRuntimeMessage(item));

  return {
    kind: 'read',
    value: {
      items: readItems.filter(
        (item): item is HermesWaRuntimeMessage => item !== null,
      ),
      // Opaque: a timestamp plus an id. Carried back untouched, never parsed
      // and never constructed here.
      nextCursor: readString(value.nextCursor),
      unreadableItemCount: readItems.filter((item) => item === null).length,
    },
  };
};

// The reply answers with one message. A payload without a readable id is not a
// success: the request did leave, and what the server made of it is unknown —
// which is UNCONFIRMED, never a failure and never a send.
export const readHermesWaReplyResult = (
  value: unknown,
): MessagingInboxPayloadRead<HermesWaRuntimeMessage> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const message = readHermesWaRuntimeMessage(value);

  return message === null
    ? { kind: 'unreadable', problem: 'malformed' }
    : { kind: 'read', value: message };
};

// The prepare answer. All four fields but the expiry are required to upload
// anything: without an asset id, a target URL and the exact content type the
// server named, there is nothing this client may legitimately PUT.
export const readHermesWaUploadTarget = (
  value: unknown,
): MessagingInboxPayloadRead<HermesWaUploadTarget> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const assetId = readString(value.assetId);
  const uploadUrl = readString(value.uploadUrl);
  const contentType = readString(value.contentType);

  if (assetId === null || uploadUrl === null || contentType === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: {
      assetId,
      uploadUrl,
      contentType,
      expiresAt: readString(value.expiresAt),
    },
  };
};

// The media read answer. A blank path is not a path: without it there is
// nothing to fetch, and guessing one would be inventing an address.
export const readHermesWaMediaReadTarget = (
  value: unknown,
): MessagingInboxPayloadRead<HermesWaMediaReadTarget> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const downloadPath = readString(value.downloadPath);

  if (downloadPath === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: { downloadPath, expiresAt: readString(value.expiresAt) },
  };
};

// The finalize answer. Reaching READY is the server's decision, so the status
// it returned is reported as it came and never assumed.
export const readHermesWaFinalizedAsset = (
  value: unknown,
): MessagingInboxPayloadRead<HermesWaRuntimeAsset> => {
  const asset = readHermesWaRuntimeAsset(value);

  return asset === null
    ? {
        kind: 'unreadable',
        problem: isJsonObject(value) ? 'malformed' : 'missing',
      }
    : { kind: 'read', value: asset };
};
