// The inbox keeps its whole state in the URL: the channel tab and the opened
// conversation. A thread can then be reloaded or shared without the screen
// having to remember anything, and the browser's back button walks the
// selection instead of leaving the page.
export const MESSAGING_INBOX_PATH = '/messaging';

export const MESSAGING_INBOX_CHANNEL_SEARCH_PARAM = 'channel';
export const MESSAGING_INBOX_CONVERSATION_SEARCH_PARAM = 'conversation';

// Lower-case in the URL, upper-case on the wire. The two are mapped
// explicitly in MessagingInboxChannel so neither leaks into the other.
export const MESSAGING_INBOX_WHATSAPP_SLUG = 'whatsapp';
export const MESSAGING_INBOX_EMAIL_SLUG = 'email';
