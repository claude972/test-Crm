import { type HermesMailboxRuntimeSavedDraft } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';

// Every key this module may own starts here, so one sweep removes all of
// them — including records written under an earlier layout.
export const HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX =
  'hermes.mailbox.draftIdentities.';

export const HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_VERSION = 'v2';

// Bounded on purpose: the oldest identities of a scope fall off rather than
// growing a list nobody prunes.
export const HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_LIMIT = 50;

// Whose identities these are.
//
// The binding's revision is part of it: an identity issued before the mailbox
// was rebound belongs to that older binding and is never offered after it.
export type HermesMailboxRuntimeDraftScope = {
  userId: string;
  workspaceId: string;
  connectedAccountId: string;
  connectionRevision: string;
};

// One native draft's identity, exactly as the server issued it.
//
// Identity only. No recipient, no subject and no body is kept here: a resume
// reads those back from the server, which is the only copy that can be right.
export type HermesMailboxRuntimeDraftIdentity = {
  draftId: string;
  draftRevision: string | null;
  conversationId: string | null;
  folder: string;
  uid: string;
  uidValidity: string;
  savedAt: string | null;
};

// The native message an identity is looked up for, as the server's own read
// of that message published it.
export type HermesMailboxRuntimeDraftLocation = {
  folder: string;
  uid: string;
  uidValidity: string;
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

// Segments are encoded, so a value carrying the separator cannot spell out a
// different scope than the one it belongs to.
const scopeSegments = (scope: HermesMailboxRuntimeDraftScope): string[] =>
  [
    scope.userId,
    scope.workspaceId,
    scope.connectedAccountId,
    scope.connectionRevision,
  ].map((segment) => encodeURIComponent(segment));

export const hermesMailboxRuntimeDraftIdentityKey = (
  scope: HermesMailboxRuntimeDraftScope,
): string =>
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX +
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_VERSION +
  ':' +
  scopeSegments(scope).join(':');

// Every key of this account under this user and workspace, whatever binding
// revision wrote it. Used to drop what a rebinding has superseded.
const accountKeyPrefix = (scope: HermesMailboxRuntimeDraftScope): string =>
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX +
  HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_VERSION +
  ':' +
  scopeSegments(scope).slice(0, 3).join(':') +
  ':';

// A record is usable only when it can both name a draft and address the
// native message it landed on. A part missing makes it unusable, and an
// unusable identity is dropped rather than completed with a guess.
const readIdentity = (
  value: unknown,
): HermesMailboxRuntimeDraftIdentity | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const draftId = readString(row.draftId);
  const folder = readString(row.folder);
  const uid = readString(row.uid);
  const uidValidity = readString(row.uidValidity);

  if (
    draftId === null ||
    folder === null ||
    uid === null ||
    uidValidity === null
  ) {
    return null;
  }

  return {
    draftId,
    draftRevision: readString(row.draftRevision),
    conversationId: readString(row.conversationId),
    folder,
    uid,
    uidValidity,
    savedAt: readString(row.savedAt),
  };
};

const localKeys = (): string[] => {
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
};

const removeKeys = (keys: string[]): void => {
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // A refused removal is not reported: nothing a person could do about
      // it, and the scope check still keeps the record out of reach.
    }
  }
};

// Reading storage can throw outright — a private window, or site data the
// browser refuses — so a failure is an empty list and never an exception.
export const readHermesMailboxRuntimeDraftIdentities = (
  scope: HermesMailboxRuntimeDraftScope,
): HermesMailboxRuntimeDraftIdentity[] => {
  try {
    const raw = window.localStorage.getItem(
      hermesMailboxRuntimeDraftIdentityKey(scope),
    );

    if (raw === null) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => readIdentity(entry))
      .filter(
        (entry): entry is HermesMailboxRuntimeDraftIdentity => entry !== null,
      )
      .slice(0, HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_LIMIT);
  } catch {
    return [];
  }
};

// The identity for one native message, or null.
//
// The match is a message's identity in IMAP: its folder, its UID and the
// UIDVALIDITY that UID is only addressable under. A validity that has moved
// on matches nothing, which is the correct answer.
export const findHermesMailboxRuntimeDraftIdentity = (
  identities: HermesMailboxRuntimeDraftIdentity[],
  location: HermesMailboxRuntimeDraftLocation,
): HermesMailboxRuntimeDraftIdentity | null =>
  identities.find(
    (entry) =>
      entry.folder === location.folder &&
      entry.uid === location.uid &&
      entry.uidValidity === location.uidValidity,
  ) ?? null;

// Upsert on the stable draft id, because an edited draft keeps its identity
// and moves to a new UID: keying on the location would leave the old record
// behind, pointing at a message the server has moved to Trash.
export const putHermesMailboxRuntimeDraftIdentity = (
  identities: HermesMailboxRuntimeDraftIdentity[],
  draft: HermesMailboxRuntimeSavedDraft,
): HermesMailboxRuntimeDraftIdentity[] => {
  const record = readIdentity(draft);

  // An answer that did not name a native location cannot be resumed from, so
  // nothing is stored and no resume will be offered for it.
  if (record === null) {
    return identities;
  }

  return [
    record,
    ...identities.filter((entry) => entry.draftId !== record.draftId),
  ].slice(0, HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_LIMIT);
};

export const writeHermesMailboxRuntimeDraftIdentities = (
  scope: HermesMailboxRuntimeDraftScope,
  identities: HermesMailboxRuntimeDraftIdentity[],
): void => {
  const key = hermesMailboxRuntimeDraftIdentityKey(scope);

  // What an earlier binding of this same account wrote is superseded, so it
  // goes now rather than sitting there until the next sign-out.
  removeKeys(
    localKeys().filter(
      (candidate) =>
        candidate !== key && candidate.startsWith(accountKeyPrefix(scope)),
    ),
  );

  try {
    window.localStorage.setItem(key, JSON.stringify(identities));
  } catch {
    // A refused write is not an error to show: the draft is saved on the
    // provider either way. It only means this browser will not offer the
    // resume, and the screen already says so when it cannot.
  }
};

// Every draft identity this origin holds, for every scope and every layout.
//
// Called from the session purge: draft metadata belongs to the session it was
// issued to and must not outlive it on the device.
export const clearHermesMailboxRuntimeDraftIdentities = (): void => {
  removeKeys(
    localKeys().filter((key) =>
      key.startsWith(HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_PREFIX),
    ),
  );
};
