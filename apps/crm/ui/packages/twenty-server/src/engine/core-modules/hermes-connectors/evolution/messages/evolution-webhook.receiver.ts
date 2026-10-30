import { timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

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

export class EvolutionWebhookReceiver {
  readonly #connections: Record<string, EvolutionConnection>;
  readonly #tokens: Record<string, string>;
  readonly #ingest: EvolutionIngest;

  constructor(
    serializedConnections: string,
    serializedSecrets: string,
    ingest: EvolutionIngest,
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
    const text =
      data.message.conversation ?? data.message.extendedTextMessage?.text;
    if (!text) return { status: 'IGNORED', reason: 'UNSUPPORTED_MESSAGE' };
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

    // Durable duplicate handling belongs to the core's unique provider ledger,
    // never to a per-process cache that loses entries on restart.
    const result = await this.#ingest({
      workspaceId,
      channel: 'WHATSAPP',
      providerConnectionId: evolutionProviderConnectionId(
        this.#connections[workspaceId],
      ),
      providerMessageId: data.key.id,
      providerConversationId: data.key.remoteJid,
      direction: data.key.fromMe ? 'OUTBOUND' : 'INBOUND',
      contactHandle,
      text,
      occurredAt: new Date(seconds * 1000).toISOString(),
    });
    return { status: 'INGESTED', result };
  }
}
