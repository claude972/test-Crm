import { isMessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';
import {
  isMessagingInboxConnectionState,
  type MessagingInboxConnection,
} from '@/messaging-inbox/types/MessagingInboxConnection';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';
import { readMessagingInboxDirection } from '@/messaging-inbox/types/MessagingInboxDirection';
import {
  isMessagingInboxDraftMode,
  isMessagingInboxDraftStatus,
  type MessagingInboxDraftReply,
} from '@/messaging-inbox/types/MessagingInboxDraftReply';
import {
  isMessagingInboxEmailSyncState,
  type MessagingInboxEmailSyncResult,
} from '@/messaging-inbox/types/MessagingInboxEmailSync';
import { type MessagingInboxMessage } from '@/messaging-inbox/types/MessagingInboxMessage';
import { readMessagingInboxMessageStatus } from '@/messaging-inbox/types/MessagingInboxMessageStatus';
import {
  type MessagingInboxPage,
  type MessagingInboxPayloadRead,
} from '@/messaging-inbox/types/MessagingInboxPage';

// The inbox operations are not in the generated schema, so nothing
// type-checks their payloads at compile time — and the contract states that
// every channel and status value travels as a String, so even a typed DTO
// carries vocabularies this client cannot assume are closed.
//
// Everything below reduces the answer field by field: a field that is absent
// or of the wrong type becomes null, a value outside a published set is kept
// verbatim as unknown, and a payload whose shape does not match the contract
// becomes 'unreadable' — never an empty list.

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

// Counts only. A non-finite number is not rounded or clamped into one: it
// becomes unknown, because a figure the client repaired would read as the
// server's.
const readCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

// Message bodies keep their own whitespace: trimming the inside of a customer
// message would alter what they wrote. Only a non-string or an all-blank body
// becomes null.
const readBody = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim().length > 0 ? value : null;
};

export const readMessagingInboxConversation = (
  value: unknown,
): MessagingInboxConversation | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const id = readString(value.id);

  // A conversation without an id cannot be opened or replied to, so it is not
  // kept as a half-entry. Callers count what they dropped.
  if (id === null) {
    return null;
  }

  const rawChannel = value.channel;

  return {
    id,
    channel: isMessagingInboxChannel(rawChannel) ? rawChannel : null,
    unknownChannel: isMessagingInboxChannel(rawChannel)
      ? null
      : readString(rawChannel),
    providerConnectionId: readString(value.providerConnectionId),
    contactHandle: readString(value.contactHandle),
    personId: readString(value.personId),
    // Value set unpublished: kept as the server's own string.
    personMatchStatus: readString(value.personMatchStatus),
    subject: readString(value.subject),
    lastMessageAt: readString(value.lastMessageAt),
    // Pending bot delegation runtime. Read if present, never required.
    botMode: readString(value.botMode),
    botModeUpdatedAt: readString(value.botModeUpdatedAt),
  };
};

export const readMessagingInboxMessage = (
  value: unknown,
): MessagingInboxMessage | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const id = readString(value.id);

  if (id === null) {
    return null;
  }

  const rawChannel = value.channel;

  return {
    id,
    conversationId: readString(value.conversationId),
    channel: isMessagingInboxChannel(rawChannel) ? rawChannel : null,
    unknownChannel: isMessagingInboxChannel(rawChannel)
      ? null
      : readString(rawChannel),
    direction: readMessagingInboxDirection(value.direction),
    text: readBody(value.text),
    occurredAt: readString(value.occurredAt),
    status: readMessagingInboxMessageStatus(value.status),
    errorCode: readString(value.errorCode),
    providerMessageId: readString(value.providerMessageId),
  };
};

const readPage = <TItem>(
  value: unknown,
  readItem: (item: unknown) => TItem | null,
): MessagingInboxPayloadRead<MessagingInboxPage<TItem>> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const rawItems = value.items;

  if (!Array.isArray(rawItems)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const readItems = rawItems.map((item) => readItem(item));

  return {
    kind: 'read',
    value: {
      items: readItems.filter((item): item is TItem => item !== null),
      // The cursor is opaque — a timestamp plus an id. It is carried back
      // untouched and never parsed or constructed here.
      nextCursor: readString(value.nextCursor),
      unreadableItemCount: readItems.filter((item) => item === null).length,
    },
  };
};

export const readMessagingInboxConversationPage = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxPage<MessagingInboxConversation>> =>
  readPage(value, readMessagingInboxConversation);

export const readMessagingInboxMessagePage = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxPage<MessagingInboxMessage>> =>
  readPage(value, readMessagingInboxMessage);

// The reply mutation answers with one message. A payload without a readable
// id is not a success: the request did leave, but the client does not know
// what the server made of it, and an unknown outcome is UNCONFIRMED, never a
// failure and never a send.
export const readMessagingInboxReplyResult = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxMessage> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const message = readMessagingInboxMessage(value);

  return message === null
    ? { kind: 'unreadable', problem: 'malformed' }
    : { kind: 'read', value: message };
};

export const readMessagingInboxConnection = (
  value: unknown,
): MessagingInboxConnection | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const rawChannel = value.channel;
  const rawState = value.state;

  return {
    channel: isMessagingInboxChannel(rawChannel) ? rawChannel : null,
    unknownChannel: isMessagingInboxChannel(rawChannel)
      ? null
      : readString(rawChannel),
    state: isMessagingInboxConnectionState(rawState) ? rawState : null,
    unknownState: isMessagingInboxConnectionState(rawState)
      ? null
      : readString(rawState),
    // Read on its own, never inferred from the state.
    canSend: readBoolean(value.canSend),
    // The contract gives canSync a default of false.
    canSync: readBoolean(value.canSync) ?? false,
    lastCheckedAt: readString(value.lastCheckedAt),
    errorCode: readString(value.errorCode),
  };
};

export const readMessagingInboxConnections = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxConnection[]> => {
  if (!Array.isArray(value)) {
    return {
      kind: 'unreadable',
      problem: value === null || value === undefined ? 'missing' : 'malformed',
    };
  }

  return {
    kind: 'read',
    value: value
      .map((entry) => readMessagingInboxConnection(entry))
      .filter((entry): entry is MessagingInboxConnection => entry !== null),
  };
};

export const readMessagingInboxDraftReply = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxDraftReply> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const rawMode = value.mode;
  const rawStatus = value.status;

  return {
    kind: 'read',
    value: {
      mode: isMessagingInboxDraftMode(rawMode) ? rawMode : null,
      unknownMode: isMessagingInboxDraftMode(rawMode)
        ? null
        : readString(rawMode),
      status: isMessagingInboxDraftStatus(rawStatus) ? rawStatus : null,
      unknownStatus: isMessagingInboxDraftStatus(rawStatus)
        ? null
        : readString(rawStatus),
      provider: readString(value.provider),
      // Model-written text keeps its own whitespace, like any other body.
      text: readBody(value.text),
    },
  };
};

export const readMessagingInboxEmailSyncResult = (
  value: unknown,
): MessagingInboxPayloadRead<MessagingInboxEmailSyncResult> => {
  if (!isJsonObject(value)) {
    return { kind: 'unreadable', problem: 'missing' };
  }

  const rawState = value.state;

  return {
    kind: 'read',
    value: {
      state: isMessagingInboxEmailSyncState(rawState) ? rawState : null,
      unknownState: isMessagingInboxEmailSyncState(rawState)
        ? null
        : readString(rawState),
      received: readCount(value.received),
      replayed: readCount(value.replayed),
      skipped: readCount(value.skipped),
      moreAvailable: readBoolean(value.moreAvailable),
    },
  };
};
