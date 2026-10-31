import {
  type HermesMailboxAddress,
  type HermesMailboxBcc,
} from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxMessage } from '@/hermes-mailbox-ui/types/HermesMailboxMessage';

// The headers of a thread, as one object, because the reading pane shows them
// as one block and the server plans an answer from all of them at once.
export type HermesMailboxParticipants = {
  from: HermesMailboxAddress | null;
  // The server's Reply-To, when the message carried one. Shown because it is
  // the address an answer will actually go to, and a person is entitled to see
  // that before pressing anything. The preference itself is applied by the
  // planning operation, not here.
  replyTo: HermesMailboxAddress | null;
  to: HermesMailboxAddress[];
  cc: HermesMailboxAddress[];
  bcc: HermesMailboxBcc;
};

// One row of the thread list.
//
// Every count is nullable for the same reason the folder counts are: a figure
// the server did not send is unknown, and the row says so. `isUnread` is
// likewise three-valued — a thread whose read state the provider does not
// publish is not quietly marked read.
export type HermesMailboxThreadSummary = {
  // A string. IMAP identifiers overflow a GraphQL integer.
  id: string;
  subject: string | null;
  // The people on the thread as the list should name them, already reduced by
  // the server to the handful worth showing in a row.
  correspondents: HermesMailboxAddress[];
  lastMessageAt: string | null;
  isUnread: boolean | null;
  messageCount: number | null;
  hasAttachments: boolean | null;
};

// A draft saved against a thread.
//
// A reference, not its contents: picking it up again means asking the server to
// plan it, which is what returns the saved recipients and body. Keeping a copy
// of the fields here would give this module a second source of truth for
// recipients, which is the thing the contract took away from it.
export type HermesMailboxSavedDraft = {
  id: string;
  savedAt: string | null;
};

export type HermesMailboxThread = {
  id: string;
  subject: string | null;
  participants: HermesMailboxParticipants;
  messages: HermesMailboxMessage[];
  draft: HermesMailboxSavedDraft | null;
  // True when this is an unsent native draft for which no stable identity is
  // known here, so it cannot be resumed. Said in words rather than offered as
  // a button, because a resume without an identity cannot resume anything.
  isDraftIdentityUnknown: boolean;
};
