// The four status values the contract publishes, with the meaning it gives
// them. They travel as Strings, so a value outside this set is possible and
// stays unknown.
//
// RECEIVED    an authenticated inbound event.
// ACCEPTED    a provider receipt or an outbound echo. It NEVER asserts
//             delivery, so no label here may read as delivered.
// UNCONFIRMED persisted before any outbound network call, never resent
//             automatically under the same clientRequestId. An unknown
//             outcome stays UNCONFIRMED — it is not a failure.
// FAILED      only for the three explicit safe codes: NOT_CONFIGURED,
//             INVALID_RECIPIENT, SEND_REJECTED.
export const MESSAGING_INBOX_MESSAGE_STATUSES = [
  'RECEIVED',
  'ACCEPTED',
  'UNCONFIRMED',
  'FAILED',
] as const;

export type MessagingInboxMessageStatus =
  (typeof MESSAGING_INBOX_MESSAGE_STATUSES)[number];

export const isMessagingInboxMessageStatus = (
  value: unknown,
): value is MessagingInboxMessageStatus =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_MESSAGE_STATUSES as readonly string[]).includes(value);

// What the client knows about one message's delivery state. The three readings
// the contract keeps apart — received, accepted without proof of delivery, and
// uncertain — are three cases here and are never aggregated.
export type MessagingInboxMessageStatusRead =
  | { kind: 'known'; status: MessagingInboxMessageStatus }
  | { kind: 'unknown'; raw: string | null };

export const readMessagingInboxMessageStatus = (
  value: unknown,
): MessagingInboxMessageStatusRead => {
  if (isMessagingInboxMessageStatus(value)) {
    return { kind: 'known', status: value };
  }

  return {
    kind: 'unknown',
    raw:
      typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : null,
  };
};

// The three error codes the contract lets FAILED carry. A code outside the set
// is still shown, verbatim, but it is not given one of these meanings.
export const MESSAGING_INBOX_SAFE_ERROR_CODES = [
  'NOT_CONFIGURED',
  'INVALID_RECIPIENT',
  'SEND_REJECTED',
] as const;

export type MessagingInboxSafeErrorCode =
  (typeof MESSAGING_INBOX_SAFE_ERROR_CODES)[number];

export const isMessagingInboxSafeErrorCode = (
  value: unknown,
): value is MessagingInboxSafeErrorCode =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_SAFE_ERROR_CODES as readonly string[]).includes(value);
