import { createHash } from 'node:crypto';

import { type EvolutionConnection } from '../evolution-connection.schema';

export type EvolutionMessageInput = {
  workspaceId: string;
  conversationId: string;
  providerConnectionId: string;
  contactHandle: string;
  text: string;
  clientRequestId: string;
  media?: {
    kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
    mimeType: string;
    filename: string;
    bytes: Buffer;
  };
};

export type EvolutionIngestMessage = {
  workspaceId: string;
  channel: 'WHATSAPP';
  providerConnectionId: string;
  providerMessageId: string;
  providerConversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  contactHandle: string;
  text: string;
  occurredAt: string;
  kind?: 'IMAGE' | 'VIDEO' | 'AUDIO';
  mediaAssetId?: string;
};

export type EvolutionIngestResult = {
  conversationId: string;
  messageId: string;
  replay: boolean;
};

export type EvolutionIngest = (
  message: EvolutionIngestMessage,
) => Promise<EvolutionIngestResult>;

export class EvolutionMessageError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'EvolutionMessageError';
  }
}

export const evolutionProviderConnectionId = (
  connection: Pick<EvolutionConnection, 'baseUrl' | 'instanceName'>,
): string =>
  `evolution:${createHash('sha256')
    .update(`${connection.baseUrl}/${connection.instanceName}`)
    .digest('hex')}`;

export const EVOLUTION_DIRECT_JID = /^[1-9]\d{6,14}@s\.whatsapp\.net$/;

export const EVOLUTION_LID_JID = /^\d{1,30}@lid$/;
