import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';

// The four connection states the contract publishes, as Strings on the wire.
//
// The distinction that matters most: CONFIGURED_UNVERIFIED is NOT connected.
// It means credentials exist and the provider has not confirmed anything.
// AVAILABLE is the only provider-confirmed state, and nothing else may be
// presented as one.
export const MESSAGING_INBOX_CONNECTION_STATES = [
  'NOT_CONFIGURED',
  'CONFIGURED_UNVERIFIED',
  'AVAILABLE',
  'UNAVAILABLE',
] as const;

export type MessagingInboxConnectionState =
  (typeof MESSAGING_INBOX_CONNECTION_STATES)[number];

export const isMessagingInboxConnectionState = (
  value: unknown,
): value is MessagingInboxConnectionState =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_CONNECTION_STATES as readonly string[]).includes(value);

// One ingested shared connection.
//
// `canSend` and `canSync` describe allowed operations INDEPENDENTLY of the
// state, so they are read on their own and never inferred from it. canSync
// defaults to false per the contract; an absent canSend stays unknown, because
// nothing in the contract says it defaults to true and offering a send on a
// guess is exactly what the honesty rules forbid.
export type MessagingInboxConnection = {
  channel: MessagingInboxChannel | null;
  unknownChannel: string | null;
  state: MessagingInboxConnectionState | null;
  unknownState: string | null;
  canSend: boolean | null;
  canSync: boolean;
  // Media, voice and rich email are capabilities the server computes from a
  // real configuration. They default to false here: a capability nobody
  // confirmed is a capability the screen must not offer.
  canSendMedia: boolean;
  canReceiveMedia: boolean;
  canRecordVoice: boolean;
  canComposeRichEmail: boolean;
  lastCheckedAt: string | null;
  errorCode: string | null;
};

// What the client knows about one channel's connection.
//
// 'absent' is the contract's own rule: no registered connection means
// NOT_CONFIGURED, never a synthetic connection. It is kept apart from
// 'unknown', which is a read that failed and says nothing about setup.
export type MessagingInboxConnectionRead =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'absent' }
  | { kind: 'reported'; connection: MessagingInboxConnection };
