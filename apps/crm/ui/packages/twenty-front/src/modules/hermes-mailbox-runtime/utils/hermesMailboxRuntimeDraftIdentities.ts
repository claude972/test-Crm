import { type HermesMailboxRuntimeSavedDraft } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';

// Where the identities the server issued are kept between sessions.
//
// Versioned: a record this client can no longer read is dropped rather than
// guessed at.
export const HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_KEY =
  'hermes.mailbox.draftIdentities.v1';

// Bounded on purpose. The oldest identities fall off rather than growing a
// list nobody prunes.
export const HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_LIMIT = 50;

// One native draft's identity, exactly as the server issued it.
//
// Every field is the server's own answer, kept verbatim. Nothing here is
// derived: `draftRevision` is a signature only the server computes, and the
// native location is the folder, UID and UIDVALIDITY it answered with.
export type HermesMailboxRuntimeDraftIdentity = {
  // Which mailbox the identity was issued for. A record from another mailbox
  // is never offered, because its UIDs address a different account entirely.
  mailbox: string;
  draftId: string;
  draftRevision: string | null;
  conversationId: string | null;
  folder: string;
  uid: string;
  uidValidity: string;
  savedAt: string | null;
};

// The native message an identity is being looked up for, as the server's own
// read of that message published it.
export type HermesMailboxRuntimeDraftScope = {
  mailbox: string;
  folder: string;
  uid: string;
  uidValidity: string;
};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

// A record is usable only when it can both name a draft and address the
// native message it landed on. One missing part makes it unusable, and an
// unusable identity is dropped instead of being completed with a guess.
const readIdentity = (
  value: unknown,
): HermesMailboxRuntimeDraftIdentity | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const mailbox = readString(row.mailbox);
  const draftId = readString(row.draftId);
  const folder = readString(row.folder);
  const uid = readString(row.uid);
  const uidValidity = readString(row.uidValidity);

  if (
    mailbox === null ||
    draftId === null ||
    folder === null ||
    uid === null ||
    uidValidity === null
  ) {
    return null;
  }

  return {
    mailbox,
    draftId,
    draftRevision: readString(row.draftRevision),
    conversationId: readString(row.conversationId),
    folder,
    uid,
    uidValidity,
    savedAt: readString(row.savedAt),
  };
};

// Reading storage can throw outright — a private window, or site data the
// browser refuses — so a failure is an empty list and never an exception.
export const readHermesMailboxRuntimeDraftIdentities =
  (): HermesMailboxRuntimeDraftIdentity[] => {
    try {
      const raw = window.localStorage.getItem(
        HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_KEY,
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
// The match is the IMAP identity of a message: the mailbox it belongs to, its
// folder, its UID and the UIDVALIDITY that UID is only addressable under. A
// validity that has moved on matches nothing, which is the correct answer.
export const findHermesMailboxRuntimeDraftIdentity = (
  identities: HermesMailboxRuntimeDraftIdentity[],
  scope: HermesMailboxRuntimeDraftScope,
): HermesMailboxRuntimeDraftIdentity | null =>
  identities.find(
    (entry) =>
      entry.mailbox === scope.mailbox &&
      entry.folder === scope.folder &&
      entry.uid === scope.uid &&
      entry.uidValidity === scope.uidValidity,
  ) ?? null;

// Upsert on the stable draft id, because an edited draft keeps its identity
// and moves to a new UID: keying on the location would leave the old one
// behind, pointing at a message the server has moved to Trash.
export const putHermesMailboxRuntimeDraftIdentity = (
  identities: HermesMailboxRuntimeDraftIdentity[],
  mailbox: string,
  draft: HermesMailboxRuntimeSavedDraft,
): HermesMailboxRuntimeDraftIdentity[] => {
  const record = readIdentity({ ...draft, mailbox });

  // An answer that did not name a native location cannot be resumed from, so
  // nothing is stored and no resume will be offered for it.
  if (record === null) {
    return identities;
  }

  return [
    record,
    ...identities.filter(
      (entry) =>
        !(entry.mailbox === record.mailbox && entry.draftId === record.draftId),
    ),
  ].slice(0, HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_LIMIT);
};

export const writeHermesMailboxRuntimeDraftIdentities = (
  identities: HermesMailboxRuntimeDraftIdentity[],
): void => {
  try {
    window.localStorage.setItem(
      HERMES_MAILBOX_RUNTIME_DRAFT_IDENTITY_KEY,
      JSON.stringify(identities),
    );
  } catch {
    // A refused write is not an error to show: the draft is saved on the
    // provider either way. It only means this browser will not be able to
    // offer the resume, and the screen already says so when it cannot.
  }
};
