import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';

// Which of the three answers is being prepared. The value is what the editor
// asks the server to plan; it is not what the editor uses to work out
// recipients.
export const HERMES_MAILBOX_COMPOSE_KINDS = [
  'reply',
  'replyAll',
  'forward',
] as const;

export type HermesMailboxComposeKind =
  (typeof HERMES_MAILBOX_COMPOSE_KINDS)[number];

// Whether this mailbox may send as a given address.
//
// The contract is strict on purpose: the sender must be the mailbox's own
// address or an alias the workspace authorised by name. Sharing a domain
// grants nothing, and an address that only looks related is shown as refused
// rather than quietly accepted.
export type HermesMailboxSenderAuthority =
  | { kind: 'mailbox' }
  | { kind: 'authorizedAlias' }
  | {
      kind: 'refused';
      // 'sameDomain' is the case worth naming: it is the one a person will
      // argue with, so the screen says why sharing a domain is not authority.
      reason: 'sameDomain' | 'notAuthorized' | 'unknown';
    };

export type HermesMailboxSender = {
  address: HermesMailboxAddress;
  authority: HermesMailboxSenderAuthority;
};

// The envelope the server prepared for preview.
//
// This is the authority on recipients. The planning operation re-parses the
// original message and applies the rules this client must not reimplement: the
// Reply-To preference, the case-insensitive exclusion of our own addresses,
// deduplication across To, Cc and Bcc, the rule that a received Bcc is never
// copied into an answer, and the rule that a forward leaves with no reply
// references.
//
// The editor shows it, lets a person change it afterwards, and never
// substitutes a value of its own.
export type HermesMailboxEnvelope = {
  kind: HermesMailboxComposeKind;
  threadId: string;
  sender: HermesMailboxSender;
  to: HermesMailboxAddress[];
  cc: HermesMailboxAddress[];
  subject: string;
  // Prepared by the server too: empty for a fresh answer, the saved text when
  // the envelope was planned from a draft.
  body: string;
  // Threading headers as the server prepared them. A forward carries none.
  inReplyTo: string | null;
  references: string[];
  // What a forward would carry. In this slice they cannot be saved into a
  // draft, which the editor states before anybody presses save.
  attachments: HermesMailboxAttachment[];
};

// What the editor holds: the server's envelope plus whatever a person changed.
//
// The two are kept apart so the editor can show which fields are no longer the
// server's prepared values. Handing the parent a flat object would lose that,
// and a silent divergence between what the server planned and what is about to
// be sent is exactly what the contract moved this computation server-side to
// avoid.
export type HermesMailboxComposition = {
  kind: HermesMailboxComposeKind;
  threadId: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  // Carried for a forward's preview. A save drops them, because saving a draft
  // with attachments is not in this slice.
  attachments: HermesMailboxAttachment[];
  // The envelope this was derived from, unchanged, so the parent sends the
  // server's own threading headers back rather than inventing them.
  envelope: HermesMailboxEnvelope;
};

// The parent's answer to "may this mailbox ask for an emission at all".
//
// `null` leaves the send control out and says the availability is unknown,
// which is the honest version of a button that might do nothing.
export type HermesMailboxSendAvailability = boolean | null;

// What became of a send a human asked for.
//
// 'accepted' is a server receipt and never a delivery, so the editor says the
// server took it and stops there. Nothing in this module claims anything about
// the copy that may or may not appear in Sent: that reconciliation is still
// under review on the backend, so the editor stays silent on it.
export type HermesMailboxSendState =
  | { kind: 'idle' }
  | { kind: 'requested' }
  | { kind: 'accepted' }
  | { kind: 'failed'; message: string | null }
  | { kind: 'notConfigured' };

// What became of a save.
//
// Saving never emits anything, and the editor says that next to the control.
// It says nothing about whether saving again replaces the previous copy —
// draft replacement is under review on the backend, and a promise here would
// outrun the contract.
export type HermesMailboxDraftSaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; draftId: string | null; savedAt: string | null }
  | { kind: 'failed'; message: string | null }
  | { kind: 'notConfigured' };
