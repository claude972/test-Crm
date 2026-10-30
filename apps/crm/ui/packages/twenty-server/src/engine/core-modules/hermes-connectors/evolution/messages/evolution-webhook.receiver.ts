import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';
import { messagingId } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';

import {
  type EvolutionConnection,
  parseEvolutionConnections,
} from '../evolution-connection.schema';

import {
  EVOLUTION_DIRECT_JID,
  EVOLUTION_LID_JID,
  type EvolutionIngest,
  type EvolutionIngestResult,
  EvolutionMessageError,
  evolutionProviderConnectionId,
} from './evolution-message.types';

const envelopeSchema = z.object({
  instance: z.string().min(1).max(100),
  event: z.string().min(1).max(100),
  data: z.unknown(),
});
const messageSchema = z.object({
  key: z.object({
    id: z.string().min(1).max(256),
    remoteJid: z.string().min(1).max(256),
    remoteJidAlt: z.string().max(256).optional(),
    fromMe: z.boolean(),
  }),
  message: z.object({
    conversation: z.string().optional(),
    imageMessage: z
      .object({ caption: z.string().max(4096).optional() })
      .optional(),
    videoMessage: z
      .object({ caption: z.string().max(4096).optional() })
      .optional(),
    audioMessage: z.object({}).optional(),
    extendedTextMessage: z.object({ text: z.string().optional() }).optional(),
  }),
  messageTimestamp: z.union([z.number(), z.string().regex(/^\d{1,12}$/)]),
});

export type EvolutionWebhookResult =
  | { status: 'INGESTED'; result: EvolutionIngestResult }
  | {
      status: 'IGNORED';
      reason:
        | 'UNSUPPORTED_EVENT'
        | 'UNSUPPORTED_MESSAGE'
        | 'UNSUPPORTED_ADDRESS';
    };

export type EvolutionReceiveMedia = (input: {
  workspaceId: string;
  conversationId: string;
  providerConnectionId: string;
  providerMessageId: string;
  remoteJid: string;
  fromMe: boolean;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
}) => Promise<{ assetId: string }>;

export class EvolutionWebhookReceiver {
  readonly #connections: Record<string, EvolutionConnection>;
  readonly #tokens: Record<string, string>;
  readonly #ingest: EvolutionIngest;

  constructor(
    serializedConnections: string,
    serializedSecrets: string,
    ingest: EvolutionIngest,
    private readonly receiveMedia?: EvolutionReceiveMedia,
    private readonly context: {
      connectionId?: string;
      assertCurrent?: () => Promise<void>;
    } = {},
  ) {
    this.#connections = parseEvolutionConnections(serializedConnections);
    try {
      if (Buffer.byteLength(serializedSecrets) > 16_384) throw new Error();
      this.#tokens = z
        .record(z.string().uuid(), z.string().regex(/^[a-f0-9]{64}$/))
        .parse(JSON.parse(serializedSecrets));
      const values = Object.values(this.#tokens);
      if (new Set(values).size !== values.length || values.length > 100)
        throw new Error();
      if (
        Object.keys(this.#tokens).some(
          (workspaceId) => !this.#connections[workspaceId],
        )
      )
        throw new Error();
    } catch {
      throw new EvolutionMessageError('WEBHOOK_CONFIGURATION_INVALID');
    }
    if (
      Object.entries(this.#tokens).some(
        ([workspaceId, token]) =>
          token === this.#connections[workspaceId].apiKey,
      )
    )
      throw new EvolutionMessageError('WEBHOOK_CONFIGURATION_INVALID');
    this.#ingest = ingest;
  }

  async receive(
    token: unknown,
    body: unknown,
  ): Promise<EvolutionWebhookResult> {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
      throw new EvolutionMessageError('WEBHOOK_UNAUTHORIZED');
    let workspaceId: string | undefined;
    for (const [candidate, expected] of Object.entries(this.#tokens)) {
      if (timingSafeEqual(Buffer.from(token), Buffer.from(expected)))
        workspaceId = candidate;
    }
    if (!workspaceId) throw new EvolutionMessageError('WEBHOOK_UNAUTHORIZED');
    try {
      if (Buffer.byteLength(JSON.stringify(body) ?? '') > 131_072)
        throw new Error();
    } catch {
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');
    }
    const envelope = envelopeSchema.safeParse(body);
    if (
      !envelope.success ||
      envelope.data.instance !== this.#connections[workspaceId].instanceName
    )
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');
    if (!['messages.upsert', 'send.message'].includes(envelope.data.event))
      return { status: 'IGNORED', reason: 'UNSUPPORTED_EVENT' };
    const message = messageSchema.safeParse(envelope.data.data);
    if (!message.success)
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');
    const data = message.data;
    const contactHandle = EVOLUTION_DIRECT_JID.test(data.key.remoteJid)
      ? data.key.remoteJid
      : EVOLUTION_LID_JID.test(data.key.remoteJid) &&
          EVOLUTION_DIRECT_JID.test(data.key.remoteJidAlt ?? '')
        ? data.key.remoteJidAlt
        : undefined;
    if (!contactHandle)
      return { status: 'IGNORED', reason: 'UNSUPPORTED_ADDRESS' };
    const mediaKinds = [
      data.message.imageMessage ? 'IMAGE' : null,
      data.message.videoMessage ? 'VIDEO' : null,
      data.message.audioMessage ? 'AUDIO' : null,
    ].filter(Boolean) as ('IMAGE' | 'VIDEO' | 'AUDIO')[];
    if (mediaKinds.length > 1)
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');
    const kind = mediaKinds[0];
    const text =
      data.message.conversation ??
      data.message.extendedTextMessage?.text ??
      data.message.imageMessage?.caption ??
      data.message.videoMessage?.caption ??
      '';
    if ((!text && !kind) || (kind && !this.receiveMedia))
      return { status: 'IGNORED', reason: 'UNSUPPORTED_MESSAGE' };
    const seconds = Number(data.messageTimestamp);
    if (
      !Number.isSafeInteger(seconds) ||
      seconds < 946_684_800 ||
      seconds * 1000 > Date.now() + 300_000 ||
      text.length > 4096 ||
      text.includes('\0')
    )
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');
    if (envelope.data.event === 'send.message' && !data.key.fromMe)
      throw new EvolutionMessageError('WEBHOOK_INVALID_EVENT');

    const providerConnectionId =
      this.context.connectionId ??
      evolutionProviderConnectionId(this.#connections[workspaceId]);
    await this.context.assertCurrent?.();
    const media = kind
      ? await this.receiveMedia!({
          workspaceId,
          conversationId: messagingId(
            workspaceId,
            'WHATSAPP',
            providerConnectionId,
            data.key.remoteJid,
          ),
          providerConnectionId,
          providerMessageId: data.key.id,
          remoteJid: data.key.remoteJid,
          fromMe: data.key.fromMe,
          kind,
        })
      : undefined;
    // Durable duplicate handling belongs to the core's unique provider ledger,
    // never to a per-process cache that loses entries on restart.
    await this.context.assertCurrent?.();
    const result = await this.#ingest({
      workspaceId,
      channel: 'WHATSAPP',
      providerConnectionId,
      providerMessageId: data.key.id,
      providerConversationId: data.key.remoteJid,
      direction: data.key.fromMe ? 'OUTBOUND' : 'INBOUND',
      contactHandle,
      text,
      ...(kind && media ? { kind, mediaAssetId: media.assetId } : {}),
      occurredAt: new Date(seconds * 1000).toISOString(),
    });
    return { status: 'INGESTED', result };
  }
}
