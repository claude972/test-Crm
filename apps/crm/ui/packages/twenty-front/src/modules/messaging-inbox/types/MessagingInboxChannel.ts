import {
  MESSAGING_INBOX_EMAIL_SLUG,
  MESSAGING_INBOX_WHATSAPP_SLUG,
} from '@/messaging-inbox/constants/MessagingInboxRoutePaths';

// The two wire values the contract publishes for the `channel` filter and for
// a conversation's own `channel` field. Never displayed raw.
export const MESSAGING_INBOX_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;

export type MessagingInboxChannel = (typeof MESSAGING_INBOX_CHANNELS)[number];

export const isMessagingInboxChannel = (
  value: unknown,
): value is MessagingInboxChannel =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_CHANNELS as readonly string[]).includes(value);

export const getMessagingInboxChannelSlug = (
  channel: MessagingInboxChannel,
): string =>
  channel === 'WHATSAPP'
    ? MESSAGING_INBOX_WHATSAPP_SLUG
    : MESSAGING_INBOX_EMAIL_SLUG;

// An unreadable or absent slug falls back to WhatsApp rather than to a third
// "all channels" mode: the contract has no such filter, so offering one would
// promise a query the server cannot answer.
export const readMessagingInboxChannelSlug = (
  slug: string | null,
): MessagingInboxChannel =>
  slug === MESSAGING_INBOX_EMAIL_SLUG ? 'EMAIL' : 'WHATSAPP';

// Only the email channel carries a subject. A WhatsApp conversation has none,
// and an empty subject column on it would read as a missing value.
export const channelHasSubject = (channel: MessagingInboxChannel): boolean =>
  channel === 'EMAIL';
