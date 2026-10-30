import {
  type HermesConnectionKind,
  type HermesConnectionState,
} from '@/hermes-admin-ui/types/HermesConnection';

// The non-secret part of a connection form.
//
// There is no secret field in this type on purpose. A secret is never read
// back, never held in a draft that could be echoed, and never submitted
// alongside the rest without the operator having typed it in this session.
export type HermesConnectionFormValues = {
  label: string;
  endpoint: string;
  account: string;
  // The native connected account this link uses. Chosen from the existing
  // encrypted accounts, never typed, and never a credential.
  nativeAccountId: string;
  // An IMAP FOLDER, not an address. The server locks this folder while it
  // collects. Its usual value is INBOX.
  imapFolder: string;
};

export const HERMES_CONNECTION_FORM_EMPTY_VALUES: HermesConnectionFormValues = {
  label: '',
  endpoint: '',
  account: '',
  nativeAccountId: '',
  imapFolder: '',
};

// One native connected account the operator may pick. Already encrypted on the
// server side; `address` is what the server attaches to it, read only, and a
// consequence of the choice rather than an input.
export type HermesNativeConnectedAccount = {
  id: string;
  address: string | null;
  label: string | null;
};

// Which field a validation message belongs to, so the message is rendered
// against its own control and announced with it.
export type HermesConnectionFormField = keyof HermesConnectionFormValues;

export type HermesConnectionFormErrors = Partial<
  Record<HermesConnectionFormField, string>
>;

// What the form is being used for. Editing carries the existing connection's
// identity so the parent knows what to write, and whether a secret is already
// stored server-side.
export type HermesConnectionFormSubject =
  | { mode: 'create'; kind: HermesConnectionKind }
  | {
      mode: 'edit';
      kind: HermesConnectionKind | null;
      unknownKind: string | null;
      connectionId: string;
      state: HermesConnectionState | null;
      hasStoredSecret: boolean | null;
      // The revision this connection was read at, passed back untouched as
      // the expected revision. Null means it was read without one, and a
      // change without one could overwrite someone else's decision: nothing
      // is sent in that case.
      revision: string | null;
    };

// What leaves the form when it is submitted.
//
// `secret` is a decision, not a value to be echoed: 'unchanged' means nothing
// about the stored secret is sent at all, so the server keeps what it has.
export type HermesConnectionFormSubmission = {
  values: HermesConnectionFormValues;
  secret: { kind: 'unchanged' } | { kind: 'replaced'; value: string };
  // Echoed back exactly as read, for the server to refuse the write on. Null
  // only on a create, where there is nothing yet to be stale against.
  expectedRevision: string | null;
};

// The save state the parent hands back. The form never decides it.
export type HermesConnectionSaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; verifiedAt: string | null }
  | { kind: 'refused'; reason: string | null }
  // Nothing left the browser. Kept apart from a refusal, which means the
  // server saw the write and declined it.
  | { kind: 'not-sent'; reason: 'missing-revision' | 'stale-context' }
  // The backend's named refusal: the session and the native cookie no longer
  // agree. It is an answer, so it asks for a reload rather than a retry.
  | { kind: 'session-replaced'; message: string | null }
  | { kind: 'unconfirmed' };

// The result of « Tester la connexion », as the parent reports it.
//
// 'unconfirmed' is a test whose answer could not be read: it proves nothing,
// so it is not a failure and certainly not a success. No outcome is ever
// inferred from the request having been sent.
export type HermesConnectionTestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'verified'; verifiedAt: string | null }
  | { kind: 'failed'; errorCode: string | null }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'session-replaced'; message: string | null }
  | { kind: 'unconfirmed' };

// Where a connection's credentials actually live. 'native-account' is e-mail:
// it runs on the already encrypted native connected account, and there is no
// second credential store of ours. The form settles the link and offers no
// mailbox password at all, which would invite a forbidden duplicate store.
export type HermesConnectionSecretPolicy =
  | { kind: 'own-secret' }
  | { kind: 'native-account' }
  | { kind: 'unknown' };
