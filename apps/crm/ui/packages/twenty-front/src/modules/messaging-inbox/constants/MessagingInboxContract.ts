// The published bounds, and nothing invented beside them.
//
// Both list inputs accept limit 1..100. The contract's own defaults are used
// rather than larger pages: a server that caps lower answers with fewer items
// and a cursor, which this screen already walks.
export const MESSAGING_INBOX_CONVERSATIONS_PAGE_SIZE = 30;
export const MESSAGING_INBOX_MESSAGES_PAGE_SIZE = 50;

// hermesInboxReply accepts text of 1..20000 characters. Enforced here so an
// over-long body is refused before it reaches the provider, with the count in
// front of the operator while they type.
export const MESSAGING_INBOX_REPLY_MIN_LENGTH = 1;
export const MESSAGING_INBOX_REPLY_MAX_LENGTH = 20000;

// How many pages one surface will walk through. The cursor is opaque and the
// server may keep handing one back, so this bounds what a single screen can
// pull into memory. It is a client limit and is said as one.
export const MESSAGING_INBOX_MAX_PAGES = 40;
