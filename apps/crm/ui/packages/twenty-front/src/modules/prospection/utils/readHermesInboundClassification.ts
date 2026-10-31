import {
  type HermesInboundItem,
  type HermesInboundItemReadState,
  type HermesInboundLinks,
  type HermesInboundOrigin,
  type HermesScrapingClassificationReadState,
  type HermesScrapingCounts,
  type HermesScrapingDeposit,
  readHermesAttribution,
  readHermesInboundSource,
} from '@/prospection/types/HermesInboundClassification';

// Both classification queries are typed DTOs, but their enum fields arrive as
// plain strings, so every value below is still reduced field by field. A field
// that is absent or of the wrong type becomes null, and a payload whose shape
// does not match becomes 'unreadable' — never an empty classification.
//
// Nothing here infers. The attribution is read from the field the server
// computed and is never derived from the presence of a connection id, and the
// no-deal statement is read rather than assumed: see
// HermesInboundClassification.

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

// A count that is absent or not a finite non-negative integer is unknown, not
// zero: reporting zero duplicates when the payload said nothing would be a
// claim the server never made.
const readCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

// Non-string entries are dropped rather than stringified, so an identifier the
// client invented can never be rendered as a link to a record.
const readIdList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const readOrigin = (value: unknown): HermesInboundOrigin => {
  const origin = isJsonObject(value) ? value : {};

  return {
    source: readHermesInboundSource(origin.source),
    provider: readString(origin.provider),
    connectionId: readString(origin.connectionId),
    structureId: readString(origin.structureId),
    eventId: readString(origin.eventId),
    receivedAt: readString(origin.receivedAt),
    attribution: readHermesAttribution(origin.attribution),
  };
};

const readLinks = (value: unknown): HermesInboundLinks => {
  const links = isJsonObject(value) ? value : {};

  return {
    personId: readString(links.personId),
    companyId: readString(links.companyId),
    noteId: readString(links.noteId),
    calendarEventId: readString(links.calendarEventId),
    conversationId: readString(links.conversationId),
    existingOpportunityIds: readIdList(links.existingOpportunityIds),
  };
};

const readCounts = (value: unknown): HermesScrapingCounts => {
  const counts = isJsonObject(value) ? value : {};

  return {
    total: readCount(counts.total),
    pending: readCount(counts.pending),
    invalid: readCount(counts.invalid),
    duplicate: readCount(counts.duplicate),
    suppressed: readCount(counts.suppressed),
    conflict: readCount(counts.conflict),
    qualified: readCount(counts.qualified),
  };
};

export const readHermesInboundItemClassification = (
  payload: unknown,
): HermesInboundItemReadState => {
  if (payload === null || payload === undefined) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  if (!isJsonObject(payload)) {
    return { kind: 'unreadable', problem: 'not-an-object' };
  }

  // The three stated facts stay three distinct answers. 'NOT_FOUND' is the
  // server saying this receipt is unknown to this company, which is not an
  // error and must not be shown as one.
  if (payload.status === 'NOT_CONFIGURED') {
    return { kind: 'not-configured' };
  }

  if (payload.status === 'NOT_FOUND') {
    return { kind: 'not-found' };
  }

  if (payload.status !== 'CLASSIFIED') {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  const links = readLinks(payload.links);

  const item: HermesInboundItem = {
    origin: readOrigin(payload.origin),
    links,
    // The server's own LINKED/UNLINKED answer is authoritative. The presence
    // of a personId is only the fallback when that field is unusable, and the
    // two are never allowed to disagree silently in favour of "linked".
    isContactLinked:
      payload.contactState === 'LINKED'
        ? true
        : payload.contactState === 'UNLINKED'
          ? false
          : links.personId !== null,
    automaticDealCreated: readBoolean(payload.automaticDealCreated),
  };

  return { kind: 'classified', item };
};

const readDeposit = (value: unknown): HermesScrapingDeposit | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const batchId = readString(value.batchId);

  // A deposit without a batch id cannot be correlated with the collection on
  // screen, so it is not kept as a half-deposit. The caller counts what it
  // dropped rather than letting it disappear.
  if (batchId === null) {
    return null;
  }

  return {
    batchId,
    externalBatchId: readString(value.externalBatchId),
    origin: readOrigin(value.origin),
    counts: readCounts(value.counts),
    isQualificationRequired: readBoolean(value.qualificationRequired),
    linkedPersonIds: readIdList(value.linkedPersonIds),
    linkedCompanyIds: readIdList(value.linkedCompanyIds),
  };
};

export const readHermesScrapingClassification = (
  payload: unknown,
): HermesScrapingClassificationReadState => {
  if (payload === null || payload === undefined) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  if (!isJsonObject(payload)) {
    return { kind: 'unreadable', problem: 'not-an-object' };
  }

  if (!Array.isArray(payload.batches)) {
    return { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  return {
    kind: 'classified',
    deposits: payload.batches
      .map((batch) => readDeposit(batch))
      .filter((batch): batch is HermesScrapingDeposit => batch !== null),
    automaticDealCreated: readBoolean(payload.automaticDealCreated),
  };
};
