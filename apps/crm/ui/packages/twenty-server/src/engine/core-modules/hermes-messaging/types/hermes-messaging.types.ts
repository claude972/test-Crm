export const HERMES_MESSAGING_ADAPTERS = Symbol('HERMES_MESSAGING_ADAPTERS');
export type HermesMessagingChannel = 'WHATSAPP' | 'EMAIL';
export type HermesMessagingDirection = 'INBOUND' | 'OUTBOUND';
export type HermesMessagingStatus =
  | 'RECEIVED'
  | 'OBSERVED'
  | 'PENDING'
  | 'ACCEPTED'
  | 'FAILED'
  | 'UNCONFIRMED';
export type HermesMessagingActor = {
  workspaceId: string;
  userId: string;
  userWorkspaceId: string;
};
export type HermesMessagingProbe = {
  status:
    | 'NOT_CONFIGURED'
    | 'CONFIGURED_UNVERIFIED'
    | 'AVAILABLE'
    | 'UNAVAILABLE';
  canSend?: boolean;
  canSync?: boolean;
  canSendMedia?: boolean;
  canReceiveMedia?: boolean;
  canRecordVoice?: boolean;
  canComposeRichEmail?: boolean;
  errorCode?: string;
};
export type HermesMessagingSend = {
  workspaceId: string;
  conversationId: string;
  providerConnectionId: string;
  contactHandle: string;
  text: string;
  clientRequestId: string;
  email?: HermesEmailEnvelope;
  attachments?: HermesMessagingAttachment[];
  media?: {
    kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
    mimeType: string;
    filename: string;
    bytes: Buffer;
  };
};
export type HermesMessagingReceipt = {
  providerMessageId: string;
  acceptedAt: string;
};
export type HermesMessagingAdapter = {
  channel: HermesMessagingChannel;
  probe(workspaceId: string): Promise<HermesMessagingProbe>;
  send(input: HermesMessagingSend): Promise<HermesMessagingReceipt>;
};
export type HermesMessagingEvent = {
  workspaceId: string;
  channel: HermesMessagingChannel;
  direction: HermesMessagingDirection;
  providerConnectionId: string;
  providerMessageId: string;
  providerConversationId: string;
  contactHandle: string;
  text: string;
  occurredAt: string;
  subject?: string;
  providerMetadata?: HermesMessagingProviderMetadata;
  kind?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'EMAIL';
  mediaAssetId?: string;
  attachmentIds?: string[];
};
export type HermesInboxPageInput = { limit?: number; cursor?: string };
export type HermesInboxConversationsInput = HermesInboxPageInput & {
  channel?: HermesMessagingChannel;
};
export type HermesInboxMessagesInput = HermesInboxPageInput & {
  conversationId: string;
};
export type HermesInboxReplyInput = {
  conversationId: string;
  clientRequestId: string;
  text: string;
};

export const HERMES_MESSAGING_BOT_ADAPTER = Symbol(
  'HERMES_MESSAGING_BOT_ADAPTER',
);
export type HermesMessagingBotResult = {
  mode: 'MANUAL' | 'DRAFT';
  status: 'NOT_CONFIGURED' | 'READY' | 'UNAVAILABLE';
  text?: string;
  provider: 'HERMES_MCP';
};
export type HermesMessagingBotAdapter = {
  draftReply(input: {
    workspaceId: string;
    conversationId: string;
    messageId: string;
    text: string;
    channel: HermesMessagingChannel;
  }): Promise<HermesMessagingBotResult>;
};

export type HermesBotPolicyMode = 'AUTO' | 'ASSISTED' | 'OFF';
export type HermesBotPolicyOverrideMode = HermesBotPolicyMode | 'INHERIT';
export type HermesBotPolicyScope = 'WORKSPACE' | HermesMessagingChannel;
export type HermesBotMode = 'MANUAL' | HermesBotPolicyMode | 'INHERIT';
export type HermesConversationBotPolicy = {
  conversationId: string;
  localMode: string;
  effectiveMode: HermesBotPolicyMode;
  reason: string;
  revision: string;
  canDraft: boolean;
  canAutoReply: boolean;
};

export type HermesMessagingProviderMetadata = {
  mimeSha256?: string;
  rfcMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  mailbox?: string;
  uidValidity?: string | number;
  uid?: number;
};

export type HermesInboxReplyV3Input = {
  conversationId: string;
  clientRequestId: string;
  kind: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  text: string;
  assetId?: string;
};

// Server-only envelope. Never include Bcc or raw HTML in the inbox DTO.
export type HermesEmailEnvelope = {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  inlineAttachments?: { assetId: string; cid: string }[];
};
export type HermesMessagingAttachment = {
  assetId: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  mimeType: string;
  filename: string;
  bytes: Buffer;
};
export type HermesEmailReplyInput = {
  conversationId: string;
  clientRequestId: string;
  envelope: HermesEmailEnvelope;
  attachmentIds: string[];
};
