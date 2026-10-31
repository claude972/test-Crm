import {
  type HermesMailboxRuntimeAttachment,
  type HermesMailboxRuntimeClonedAsset,
  type HermesMailboxRuntimeDraftOutcome,
  type HermesMailboxRuntimeMailConnection,
  type HermesMailboxRuntimeNewDraftOutcome,
  type HermesMailboxRuntimeFolders,
  type HermesMailboxRuntimeMediaRead,
  type HermesMailboxRuntimeMessage,
  type HermesMailboxRuntimePage,
  type HermesMailboxRuntimePlan,
  type HermesMailboxRuntimeRead,
  type HermesMailboxRuntimeSendOutcome,
} from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { type HermesMailboxAddress, type HermesMailboxBcc } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxBody } from '@/hermes-mailbox-ui/types/HermesMailboxBody';
import {
  type HermesMailboxFolder,
  type HermesMailboxFolderRole,
} from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxThreadSummary } from '@/hermes-mailbox-ui/types/HermesMailboxThread';

// Every mail operation answers with a JSONObject, so nothing type-checks these
// payloads at compile time and no vocabulary can be assumed closed.
//
// Everything below reduces the answer field by field: an absent or wrongly
// typed field becomes null, a row without a usable identifier is dropped and
// counted, and a payload whose shape does not match the contract becomes
// 'unreadable'. None of those ever becomes an empty mailbox.

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

// Bodies keep their own whitespace: trimming the inside of somebody's mail
// would alter what they wrote. Only a non-string or an all-blank body is null.
const readBodyText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim().length > 0 ? value : null;
};

// Counts only. A non-finite number is not repaired into one: it becomes
// unknown, because a figure this client mended would read as the server's.
const readCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readStringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => readString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];

// The two address shapes the contract publishes: the folder listing sends
// `{address,name}` pairs, the message read sends bare addresses. Neither is
// turned into the other, and a display name is never promoted to an address.
const readAddress = (value: unknown): HermesMailboxAddress | null => {
  const bare = readString(value);

  if (bare !== null) {
    return { display: null, email: bare, raw: bare };
  }

  if (!isJsonObject(value)) {
    return null;
  }

  const email = readString(value.address);
  const display = readString(value.name);

  if (email === null && display === null) {
    return null;
  }

  return {
    display,
    email,
    // Rebuilt for display only, from the two fields the server sent. Nothing
    // reads it back as a header.
    raw:
      display !== null && email !== null
        ? display + ' <' + email + '>'
        : (email ?? display ?? ''),
  };
};

const readAddressList = (value: unknown): HermesMailboxAddress[] =>
  Array.isArray(value)
    ? value
        .map((entry) => readAddress(entry))
        .filter((entry): entry is HermesMailboxAddress => entry !== null)
    : [];

// The server's five roles, lowercased to the library's vocabulary. 'CUSTOM' is
// not one of them: such a folder keeps its provider name instead of being
// pushed into the nearest role.
const FOLDER_ROLES: Record<string, HermesMailboxFolderRole> = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFTS: 'drafts',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

const readFolder = (value: unknown): HermesMailboxFolder | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  // The path is the folder's identity for every later operation, so a folder
  // without one is not kept as a half-entry.
  const path = readString(value.path);

  if (path === null) {
    return null;
  }

  const rawRole = readString(value.role);
  const role = rawRole === null ? null : (FOLDER_ROLES[rawRole] ?? null);

  return {
    id: path,
    role,
    label: role === null ? (readString(value.name) ?? path) : null,
    counts: {
      unread: readCount(value.unread),
      total: readCount(value.total),
    },
  };
};

export const readHermesMailboxRuntimeFolders = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeFolders> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  // The server states an absent configuration in the payload. It is the fact
  // the whole screen turns on, and it is never read as an empty mailbox.
  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  if (!Array.isArray(payload.folders)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: {
      folders: payload.folders
        .map((entry) => readFolder(entry))
        .filter((entry): entry is HermesMailboxFolder => entry !== null),
    },
  };
};

const readSummary = (value: unknown): HermesMailboxThreadSummary | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  // The UID is a string and it is this row's identity. A row without one
  // cannot be opened, so it is dropped — and counted, because silently
  // shortening a list is the same lie as inventing one.
  const uid = readString(value.uid);

  if (uid === null) {
    return null;
  }

  const seen = readBoolean(value.seen);

  return {
    id: uid,
    subject: readString(value.subject),
    correspondents: readAddressList(value.from),
    lastMessageAt: readString(value.occurredAt),
    // A provider that does not publish a read state leaves the row unknown
    // rather than quietly marked read.
    isUnread: seen === null ? null : !seen,
    // The folder listing is one row per message, not per thread, so the
    // contract gives no count and none is invented.
    messageCount: null,
    hasAttachments: null,
  };
};

export const readHermesMailboxRuntimePage = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimePage> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  const uidValidity = readString(payload.uidValidity);

  // Without the validity the UIDs in this page are not addressable, so the
  // page is unreadable rather than a list of rows nothing can open.
  if (uidValidity === null || !Array.isArray(payload.messages)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const rows = payload.messages.map((entry) => readSummary(entry));

  return {
    kind: 'read',
    value: {
      uidValidity,
      folder: readString(payload.folder),
      summaries: rows.filter(
        (entry): entry is HermesMailboxThreadSummary => entry !== null,
      ),
      // Opaque: the server packs the folder, the validity and a UID bound into
      // it. Carried back untouched.
      nextCursor: readString(payload.nextCursor),
      unreadableItemCount: rows.filter((entry) => entry === null).length,
    },
  };
};

const readAttachment = (
  value: unknown,
): HermesMailboxRuntimeAttachment | null => {
  if (!isJsonObject(value)) {
    return null;
  }

  const state = readString(value.state);

  return {
    index: readCount(value.index),
    assetId: readString(value.assetId),
    contentId: readString(value.contentId),
    filename: readString(value.filename),
    mimeType: readString(value.mimeType),
    state:
      state === 'READY' || state === 'UNSUPPORTED'
        ? state
        : // A state outside the published pair says nothing, and saying
          // nothing is not the same as saying the file can be served.
          null,
  };
};

// The three Bcc cases are three different facts. The server omits the field
// entirely for a reader who is not the mailbox's owner, so an absent field is
// the ownership rule and not an empty Bcc.
const readBcc = (payload: JsonObject): HermesMailboxBcc => {
  if (!('bcc' in payload)) {
    return { kind: 'ownerOnly' };
  }

  if (!Array.isArray(payload.bcc)) {
    return { kind: 'unknown' };
  }

  return { kind: 'disclosed', addresses: readAddressList(payload.bcc) };
};

const readBody = (payload: JsonObject): HermesMailboxBody | null => {
  // The server sanitised this HTML and stripped every remote source. Nothing
  // here re-sanitises it and nothing offers to load images.
  const html = readBodyText(payload.html);

  if (html !== null) {
    return { kind: 'html', html };
  }

  const text = readBodyText(payload.text);

  return text === null ? null : { kind: 'text', text };
};

export const readHermesMailboxRuntimeMessage = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeMessage> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  const uid = readString(payload.uid);

  if (uid === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const direction = readString(payload.direction);
  const from = readAddressList(payload.from);

  return {
    kind: 'read',
    value: {
      conversationId: readString(payload.conversationId),
      uid,
      uidValidity: readString(payload.uidValidity),
      folder: readString(payload.folder),
      from: from[0] ?? null,
      to: readAddressList(payload.to),
      cc: readAddressList(payload.cc),
      bcc: readBcc(payload),
      subject: readString(payload.subject),
      body: readBody(payload),
      text: readBodyText(payload.text),
      // The provider's own answer. A direction outside the published pair
      // leaves it unknown rather than picking a side.
      direction:
        direction === 'INBOUND' || direction === 'OUTBOUND' ? direction : null,
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments
            .map((entry) => readAttachment(entry))
            .filter(
              (entry): entry is HermesMailboxRuntimeAttachment =>
                entry !== null,
            )
        : [],
    },
  };
};

export const readHermesMailboxRuntimePlan = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimePlan> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  // A planned envelope is the only authority on recipients. Anything else on
  // the wire is not a plan, and the editor stays closed rather than opening on
  // a locally guessed set of addresses.
  if (
    readString(payload.state) !== 'PLANNED' ||
    !isJsonObject(payload.envelope)
  ) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const envelope = payload.envelope;

  return {
    kind: 'read',
    value: {
      from: readString(envelope.from),
      to: readStringList(envelope.to),
      cc: readStringList(envelope.cc),
      subject: readString(envelope.subject) ?? '',
      text: readBodyText(envelope.text) ?? '',
      inReplyTo: readString(envelope.inReplyTo),
      references: readStringList(envelope.references),
      conversationId: readString(payload.conversationId),
    },
  };
};

// The central MAIL connection out of the connections list.
//
// Closed by default: anything short of a configured connection carrying a
// usable `connectedAccountId` is reported as such, and the caller then offers
// no sender at all rather than falling back on a guessed account.
export const readHermesMailboxRuntimeMailConnection = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeMailConnection> => {
  if (!Array.isArray(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  const entry = payload.find(
    (candidate) => isJsonObject(candidate) && readString(candidate.kind) === 'MAIL',
  );

  if (!isJsonObject(entry)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const connectionId = readString(entry.connectionId);

  if (
    readString(entry.state) === 'NOT_CONFIGURED' ||
    connectionId === null
  ) {
    return { kind: 'notConfigured' };
  }

  if (!isJsonObject(entry.settings)) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  const connectedAccountId = readString(entry.settings.connectedAccountId);

  if (connectedAccountId === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: {
      connectionId,
      revision: readCount(entry.revision),
      connectedAccountId,
      mailbox: readString(entry.settings.mailbox),
      handle: readString(entry.settings.handle),
    },
  };
};

export const readHermesMailboxRuntimeNewDraftOutcome = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeNewDraftOutcome> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  return {
    kind: 'read',
    value: {
      state: readString(payload.state),
      replay: readBoolean(payload.replay),
      // Opaque, both of them. Read as strings and handed straight back.
      draftId: readString(payload.draftId),
      draftRevision: readString(payload.draftRevision),
      conversationId: readString(payload.conversationId),
      folder: readString(payload.folder),
      uid:
        readString(payload.uid) ??
        (typeof payload.uid === 'number' && Number.isFinite(payload.uid)
          ? String(payload.uid)
          : null),
      uidValidity: readString(payload.uidValidity),
    },
  };
};

export const readHermesMailboxRuntimeClonedAsset = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeClonedAsset> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  // Without the target asset id there is nothing a send may reference, so the
  // clone counts as not done rather than as done with an unknown id.
  const assetId = readString(payload.id);

  if (assetId === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: {
      assetId,
      filename: readString(payload.filename),
      mimeType: readString(payload.mimeType),
      sizeBytes: readCount(payload.size),
      status: readString(payload.status),
    },
  };
};

export const readHermesMailboxRuntimeSendOutcome = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeSendOutcome> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  const sentCopy = payload.sentCopy;
  const draftDisposition = payload.draftDisposition;

  return {
    kind: 'read',
    value: {
      status: readString(payload.status),
      messageId: readString(payload.id) ?? readString(payload.messageId),
      conversationId: readString(payload.conversationId),
      errorCode: readString(payload.errorCode),
      sentCopyState: isJsonObject(sentCopy) ? readString(sentCopy.state) : null,
      draftDispositionState: isJsonObject(draftDisposition)
        ? readString(draftDisposition.state)
        : null,
    },
  };
};

export const readHermesMailboxRuntimeDraftOutcome = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeDraftOutcome> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  if (readString(payload.state) === 'NOT_CONFIGURED') {
    return { kind: 'notConfigured' };
  }

  return {
    kind: 'read',
    value: {
      state: readString(payload.state),
      conversationId: readString(payload.conversationId),
      folder: readString(payload.folder),
      // Both opaque, both kept verbatim. A UID is a string even when the
      // server happens to send a number for it.
      uid:
        readString(payload.uid) ??
        (typeof payload.uid === 'number' && Number.isFinite(payload.uid)
          ? String(payload.uid)
          : null),
      uidValidity: readString(payload.uidValidity),
    },
  };
};

export const readHermesMailboxRuntimeMediaRead = (
  payload: unknown,
): HermesMailboxRuntimeRead<HermesMailboxRuntimeMediaRead> => {
  if (!isJsonObject(payload)) {
    return {
      kind: 'unreadable',
      problem:
        payload === null || payload === undefined ? 'missing' : 'malformed',
    };
  }

  const downloadPath = readString(payload.downloadPath);

  if (downloadPath === null) {
    return { kind: 'unreadable', problem: 'malformed' };
  }

  return {
    kind: 'read',
    value: { downloadPath, expiresAt: readString(payload.expiresAt) },
  };
};
