import { type MessagingInboxPayloadProblem } from '@/messaging-inbox/types/MessagingInboxPage';
import { type MessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

// hermesInboxDraftReply proposes text. It NEVER sends.
//
// The contract is explicit: no bot response dispatch occurs, and a draft
// proposal requires a separate, explicit human reply call. So a proposal lands
// in the composer as a local draft and a person presses Send. There is no
// automatic chain anywhere in this module.
//
// `mode` defaults to MANUAL, which means no draft is being proposed.
export const MESSAGING_INBOX_DRAFT_MODES = ['MANUAL', 'DRAFT'] as const;

export type MessagingInboxDraftMode =
  (typeof MESSAGING_INBOX_DRAFT_MODES)[number];

export const isMessagingInboxDraftMode = (
  value: unknown,
): value is MessagingInboxDraftMode =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_DRAFT_MODES as readonly string[]).includes(value);

export const MESSAGING_INBOX_DRAFT_STATUSES = [
  'NOT_CONFIGURED',
  'READY',
  'UNAVAILABLE',
] as const;

export type MessagingInboxDraftStatus =
  (typeof MESSAGING_INBOX_DRAFT_STATUSES)[number];

export const isMessagingInboxDraftStatus = (
  value: unknown,
): value is MessagingInboxDraftStatus =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_DRAFT_STATUSES as readonly string[]).includes(value);

export type MessagingInboxDraftReply = {
  mode: MessagingInboxDraftMode | null;
  unknownMode: string | null;
  status: MessagingInboxDraftStatus | null;
  unknownStatus: string | null;
  // The provider the contract names, kept as a plain string and displayed as
  // a label only.
  provider: string | null;
  // Model-written text. Untrusted data like any other content: it is put in a
  // textarea for a person to read and edit, never rendered as markup and never
  // acted on.
  text: string | null;
};

export type MessagingInboxDraftState =
  | { kind: 'idle' }
  | { kind: 'requested' }
  | { kind: 'read'; draft: MessagingInboxDraftReply }
  | { kind: 'unreadable'; problem: MessagingInboxPayloadProblem }
  | { kind: 'failed'; failure: MessagingInboxCallFailure };
