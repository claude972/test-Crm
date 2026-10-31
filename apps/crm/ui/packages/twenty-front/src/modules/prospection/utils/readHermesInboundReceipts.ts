import {
  type HermesInboundReceipt,
  type HermesInboundReceiptsReadState,
  readHermesAttribution,
} from '@/prospection/types/HermesInboundClassification';

// The receipts list is a typed DTO, but its enum and number fields arrive as
// plain values, so every one below is reduced field by field. A payload whose
// shape does not match becomes 'unreadable' — never an empty list, which would
// read as "this company has received nothing".
//
// Nothing here infers. The attribution is read from the field the server
// recomputed and is never derived from the presence of a connection id.

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

const readCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

// A provider outside the two the bridge publishes stays null, so a third value
// cannot be rendered as one of them.
const readProvider = (value: unknown): string | null =>
  value === 'HEYFORM' || value === 'CAL_DIY' ? value : null;

const readReceipt = (value: unknown): HermesInboundReceipt => {
  const receipt = isJsonObject(value) ? value : {};

  return {
    noteId: readString(receipt.noteId),
    provider: readProvider(receipt.provider),
    eventId: readString(receipt.eventId),
    bookingUid: readString(receipt.bookingUid),
    connectionId: readString(receipt.connectionId),
    structureId: readString(receipt.structureId),
    receivedAt: readString(receipt.receivedAt),
    attribution: readHermesAttribution(receipt.attribution),
  };
};

export const readHermesInboundReceipts = (
  payload: unknown,
): HermesInboundReceiptsReadState => {
  if (payload === null || payload === undefined) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  if (!isJsonObject(payload)) {
    return { kind: 'unreadable', problem: 'not-an-object' };
  }

  // The server's own statement that this company has no Forms or Calendar
  // connection. It is a fact, not a failure, and not an empty list either.
  if (payload.status === 'NOT_CONFIGURED') {
    return { kind: 'not-configured' };
  }

  if (payload.status !== 'LISTED') {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  if (!Array.isArray(payload.receipts)) {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  return {
    kind: 'listed',
    receipts: payload.receipts.map(readReceipt),
    checkedAt: readString(payload.checkedAt),
    cap: readCount(payload.cap),
    // Read, never defaulted to false: a missing `truncated` is an unknown
    // completeness, and showing a prefix as a whole set is the error this
    // field exists to prevent.
    truncated: readBoolean(payload.truncated),
  };
};
