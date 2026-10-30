// The four modes the V3 contract publishes, as Strings on the wire.
//
// INHERIT is not a mode the bot runs in: it says the conversation has no
// exception of its own and follows the workspace or channel policy.
export const MESSAGING_INBOX_BOT_MODES = [
  'INHERIT',
  'AUTO',
  'ASSISTED',
  'OFF',
] as const;

export type MessagingInboxBotMode =
  (typeof MESSAGING_INBOX_BOT_MODES)[number];

export const isMessagingInboxBotMode = (
  value: unknown,
): value is MessagingInboxBotMode =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_BOT_MODES as readonly string[]).includes(value);

// Why the effective mode is what it is. BOT_POLICY_INVALID is a state to
// resolve, never a mode to run in.
export const MESSAGING_INBOX_POLICY_REASONS = [
  'LOCAL_POLICY',
  'WORKSPACE_POLICY',
  'CHANNEL_POLICY',
  'BOT_POLICY_INVALID',
] as const;

export type MessagingInboxPolicyReason =
  (typeof MESSAGING_INBOX_POLICY_REASONS)[number];

export const isMessagingInboxPolicyReason = (
  value: unknown,
): value is MessagingInboxPolicyReason =>
  typeof value === 'string' &&
  (MESSAGING_INBOX_POLICY_REASONS as readonly string[]).includes(value);

// One conversation's policy as the server resolved it.
//
// `canDraft` and `canAutoReply` are the server's own capability answers. They
// are read on their own and never derived from the mode: a mode that allows a
// draft still needs a registered bot adapter, and the browser cannot know
// whether one exists.
export type MessagingInboxBotPolicy = {
  conversationId: string | null;
  localMode: MessagingInboxBotMode | null;
  unknownLocalMode: string | null;
  effectiveMode: MessagingInboxBotMode | null;
  unknownEffectiveMode: string | null;
  reason: MessagingInboxPolicyReason | null;
  unknownReason: string | null;
  revision: string | null;
  canDraft: boolean;
  canAutoReply: boolean;
};

export type MessagingInboxBotPolicyRead =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'reported'; policy: MessagingInboxBotPolicy };
