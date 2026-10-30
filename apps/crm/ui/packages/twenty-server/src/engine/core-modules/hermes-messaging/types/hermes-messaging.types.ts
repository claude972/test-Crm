export const HERMES_MESSAGING_ADAPTERS = Symbol('HERMES_MESSAGING_ADAPTERS');
export type HermesMessagingChannel = 'WHATSAPP' | 'EMAIL';
export type HermesMessagingDirection = 'INBOUND' | 'OUTBOUND';
export type HermesMessagingStatus =
  | 'RECEIVED'
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
  errorCode?: string;
};
export type HermesMessagingSend = {
  workspaceId: string;
  conversationId: string;
  providerConnectionId: string;
  contactHandle: string;
  text: string;
  clientRequestId: string;
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
  rfcMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  mailbox?: string;
  uidValidity?: string | number;
  uid?: number;
};
