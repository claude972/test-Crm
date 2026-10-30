import { type MessagingInboxPayloadProblem } from '@/messaging-inbox/types/MessagingInboxPage';
import { type MessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

// hermesInboxSyncEmail takes no input and answers with an untyped JSON object,
// so every field below is reduced defensively and a shape that does not match
// becomes unknown.
//
// BUSY means a sync is already running: the screen says so and does NOT start
// another. `moreAvailable` justifies one more press of the same button, never
// a loop.
export const MESSAGING_INBOX_EMAIL_SYNC_STATES = [
  'SYNCED',
  'PARTIAL',
  'NOT_CONFIGURED',
  'UNAVAILABLE',
  'BUSY',
] as const;

export type MessagingInboxEmailSyncState =
  (typeof MESSAGING_INBOX_EMAIL_SYNC_STATES)[number];

export const isMessagingInboxEmailSyncState = (
  value: unknown,
): value is MessagingInboxEmailSyncState =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_EMAIL_SYNC_STATES as readonly string[]).includes(value);

export type MessagingInboxEmailSyncResult = {
  state: MessagingInboxEmailSyncState | null;
  unknownState: string | null;
  received: number | null;
  replayed: number | null;
  skipped: number | null;
  moreAvailable: boolean | null;
};

export type MessagingInboxEmailSyncRunState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'read'; result: MessagingInboxEmailSyncResult }
  | { kind: 'unreadable'; problem: MessagingInboxPayloadProblem }
  | { kind: 'failed'; failure: MessagingInboxCallFailure };
