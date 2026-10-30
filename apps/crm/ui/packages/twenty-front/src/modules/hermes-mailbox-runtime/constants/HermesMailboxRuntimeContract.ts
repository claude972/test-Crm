// The published bounds of the V4 mail contract, and nothing invented beside
// them.
//
// `hermesMailMessagesV4` accepts a limit of 1..50 and defaults to 25 on the
// server. The same 25 is sent explicitly so the page size on screen is the one
// this client asked for rather than a server default that may move.
export const HERMES_MAILBOX_RUNTIME_PAGE_SIZE = 25;

// How many pages one mounted mailbox will walk. The cursor is opaque and the
// server may keep handing one back; this is a client bound and is said as one.
export const HERMES_MAILBOX_RUNTIME_MAX_PAGES = 20;

// The three compose modes, exactly as `HermesMailComposeInput.mode` publishes
// them. The library's own kinds are camel case, so the two vocabularies are
// mapped here instead of being assumed identical.
export const HERMES_MAILBOX_RUNTIME_COMPOSE_MODES = {
  reply: 'REPLY',
  replyAll: 'REPLY_ALL',
  forward: 'FORWARD',
} as const;

// Server error codes this screen has to tell apart. Everything else stays an
// unreadable answer with the server's own wording kept as a diagnostic.
export const HERMES_MAILBOX_RUNTIME_ERROR_CODES = {
  notConfigured: 'MAIL_NOT_CONFIGURED',
  cursorExpired: 'MAIL_CURSOR_EXPIRED',
  uidValidityChanged: 'MAIL_UID_VALIDITY_CHANGED',
  timeout: 'MAIL_TIMEOUT',
  connectionChanged: 'MAIL_CONNECTION_CHANGED',
  senderNotVerified: 'MAIL_SENDER_NOT_VERIFIED',
} as const;
