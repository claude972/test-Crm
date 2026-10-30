import {
  type HermesMailboxAddress,
  type HermesMailboxBcc,
} from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxBody } from '@/hermes-mailbox-ui/types/HermesMailboxBody';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxThreadSummary } from '@/hermes-mailbox-ui/types/HermesMailboxThread';

// A payload this client could not reduce to the contract. 'missing' is an
// absent or null answer — which also covers an operation the deployed schema
// does not expose yet. 'malformed' is an answer in a shape the contract does
// not describe. Neither is ever rendered as an empty mailbox.
export type HermesMailboxRuntimePayloadProblem = 'missing' | 'malformed';

// 'notConfigured' is a fact the server states in the payload itself
// (`state: 'NOT_CONFIGURED'`), not a failure, and it has its own screen.
export type HermesMailboxRuntimeRead<TValue> =
  | { kind: 'read'; value: TValue }
  | { kind: 'notConfigured' }
  | { kind: 'unreadable'; problem: HermesMailboxRuntimePayloadProblem };

export type HermesMailboxRuntimeFolders = {
  folders: HermesMailboxFolder[];
};

export type HermesMailboxRuntimePage = {
  // The validity the server selected the mailbox under. Every UID in this page
  // is only addressable together with it.
  uidValidity: string;
  folder: string | null;
  summaries: HermesMailboxThreadSummary[];
  nextCursor: string | null;
  // Rows dropped because they carried no usable UID, counted rather than
  // hidden.
  unreadableItemCount: number;
};

// One attachment as the mail read publishes it. `assetId` is present only once
// the private import succeeded; 'UNSUPPORTED' is the server saying the bytes
// will not be served.
export type HermesMailboxRuntimeAttachment = {
  index: number | null;
  assetId: string | null;
  contentId: string | null;
  filename: string | null;
  mimeType: string | null;
  state: 'READY' | 'UNSUPPORTED' | null;
};

export type HermesMailboxRuntimeMessage = {
  // The canonical conversation the server hydrated for this message. Opaque,
  // kept as it arrived, and the scope every private attachment read needs.
  conversationId: string | null;
  uid: string;
  uidValidity: string | null;
  folder: string | null;
  from: HermesMailboxAddress | null;
  to: HermesMailboxAddress[];
  cc: HermesMailboxAddress[];
  bcc: HermesMailboxBcc;
  subject: string | null;
  // Already sanitised by the server, with no remote image left in it. Nothing
  // here re-sanitises and nothing offers to show remote images.
  body: HermesMailboxBody | null;
  direction: 'INBOUND' | 'OUTBOUND' | null;
  attachments: HermesMailboxRuntimeAttachment[];
};

// The envelope the planning operation prepared. Recipients are the server's
// and are shown as such.
export type HermesMailboxRuntimePlan = {
  from: string | null;
  to: string[];
  cc: string[];
  subject: string;
  text: string;
  inReplyTo: string | null;
  references: string[];
  // Opaque. Carried back unchanged on the send that follows.
  conversationId: string | null;
};

export type HermesMailboxRuntimeSendOutcome = {
  // 'ACCEPTED' is an SMTP receipt, never a delivery.
  status: string | null;
  messageId: string | null;
  conversationId: string | null;
  errorCode: string | null;
  // Reconciliation of the provider's Sent copy is a separate fact from
  // acceptance and is never read as one.
  sentCopyState: string | null;
};

export type HermesMailboxRuntimeDraftOutcome = {
  state: string | null;
  conversationId: string | null;
  folder: string | null;
  // Opaque identifiers. Kept as they arrived, never rebuilt.
  uid: string | null;
  uidValidity: string | null;
};

export type HermesMailboxRuntimeMediaRead = {
  // Relative, session-bound and short-lived.
  downloadPath: string;
  expiresAt: string | null;
};
