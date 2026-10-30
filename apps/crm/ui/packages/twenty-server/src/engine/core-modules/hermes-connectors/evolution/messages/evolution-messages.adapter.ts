import axios from 'axios';
import { z } from 'zod';
import { HERMES_MEDIA_FORMATS } from 'src/engine/core-modules/hermes-media/hermes-media.policy';

import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';

import { EvolutionConnectionAdapter } from '../evolution-connection.adapter';
import {
  type EvolutionConnection,
  parseEvolutionConnections,
} from '../evolution-connection.schema';

import {
  EVOLUTION_DIRECT_JID,
  EVOLUTION_LID_JID,
  EvolutionMessageError,
  type EvolutionMessageInput,
  evolutionProviderConnectionId,
} from './evolution-message.types';

const inputSchema = z.object({
  workspaceId: z.string().uuid(),
  conversationId: z.string().uuid(),
  providerConnectionId: z.string().regex(/^evolution:[a-f0-9]{64}$/),
  contactHandle: z.string().regex(EVOLUTION_DIRECT_JID),
  text: z
    .string()
    .min(0)
    .max(4096)
    .refine((value) => !value.includes('\0')),
  clientRequestId: z.string().min(1).max(128),
  media: z
    .object({
      kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO']),
      mimeType: z.string().max(80),
      filename: z.string().max(160),
      bytes: z.instanceof(Buffer),
    })
    .optional(),
});

const acceptedSchema = z.object({
  key: z.object({
    id: z.string().min(1).max(256),
    remoteJid: z.string().min(1).max(256),
    remoteJidAlt: z.string().max(256).optional(),
    fromMe: z.literal(true),
  }),
});

type EvolutionMessagesOptions = {
  timeoutMs?: number;
  allowedInternalHosts?: string[];
  assertCurrent?: () => Promise<void>;
};

export class EvolutionMessagesAdapter {
  readonly channel = 'WHATSAPP' as const;
  readonly #connections: Record<string, EvolutionConnection>;
  readonly #probe: EvolutionConnectionAdapter;
  readonly #options: Required<EvolutionMessagesOptions>;

  constructor(
    serializedConnections: string,
    options: EvolutionMessagesOptions = {},
  ) {
    this.#connections = parseEvolutionConnections(serializedConnections);
    this.#options = {
      timeoutMs: options.timeoutMs ?? 3000,
      allowedInternalHosts: [...(options.allowedInternalHosts ?? [])],
      assertCurrent: options.assertCurrent ?? (async () => undefined),
    };
    this.#probe = new EvolutionConnectionAdapter(
      serializedConnections,
      this.#options,
    );
  }

  async probe(workspaceId: string): Promise<{
    status: 'NOT_CONFIGURED' | 'AVAILABLE' | 'UNAVAILABLE';
    errorCode?: string;
    canSendMedia?: boolean;
    canReceiveMedia?: boolean;
    canRecordVoice?: boolean;
  }> {
    const result = await this.#probe.probe(workspaceId);

    if (result.status === 'NOT_CONFIGURED') return { status: 'NOT_CONFIGURED' };
    if (result.status === 'PROVIDER_REPORTED_OPEN') {
      const verified = await this.mediaVersionVerified(workspaceId);
      return {
        status: 'AVAILABLE',
        canSendMedia: verified,
        canReceiveMedia: false,
        canRecordVoice: false,
      };
    }

    return {
      status: 'UNAVAILABLE',
      errorCode: result.errorCode ?? result.status,
    };
  }

  // Official tag 2.3.6 src/api/routes/index.router.ts exposes packageJson.version.
  // An open WhatsApp socket alone does not prove this media contract.
  private async mediaVersionVerified(workspaceId: string): Promise<boolean> {
    const connection = this.#connections[workspaceId];
    if (!connection) return false;
    const httpAgent = createSsrfSafeAgent(
      'http',
      this.#options.allowedInternalHosts,
    );
    const httpsAgent = createSsrfSafeAgent(
      'https',
      this.#options.allowedInternalHosts,
    );
    try {
      const response = await axios.get<unknown>(`${connection.baseUrl}/`, {
        headers: { apikey: connection.apiKey },
        httpAgent,
        httpsAgent,
        proxy: false,
        maxRedirects: 0,
        timeout: this.#options.timeoutMs,
        signal: AbortSignal.timeout(this.#options.timeoutMs),
        maxContentLength: 16_384,
        validateStatus: () => true,
      });
      return (
        response.status === 200 &&
        z.object({ version: z.literal('2.3.6') }).safeParse(response.data)
          .success
      );
    } catch {
      return false;
    } finally {
      httpAgent.destroy();
      httpsAgent.destroy();
    }
  }

  // Fetch by the authenticated provider's stored message key, never a webhook URL/mediaKey.
  // Official 2.3.6 chat.router.ts/getBase64FromMediaMessage, chat.dto.ts.
  async receiveMedia(input: {
    workspaceId: string;
    providerConnectionId: string;
    providerMessageId: string;
    remoteJid: string;
    fromMe: boolean;
    kind: 'IMAGE' | 'VIDEO' | 'AUDIO';
  }) {
    const connection = this.#connections[input.workspaceId];
    if (
      !connection ||
      input.providerConnectionId !== evolutionProviderConnectionId(connection)
    )
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    if (!(await this.mediaVersionVerified(input.workspaceId)))
      throw new EvolutionMessageError('MEDIA_PROVIDER_NOT_VERIFIED');
    if (
      !z.string().min(1).max(256).safeParse(input.providerMessageId).success ||
      (!EVOLUTION_DIRECT_JID.test(input.remoteJid) &&
        !EVOLUTION_LID_JID.test(input.remoteJid))
    )
      throw new EvolutionMessageError('INVALID_INPUT');
    const httpAgent = createSsrfSafeAgent(
      'http',
      this.#options.allowedInternalHosts,
    );
    const httpsAgent = createSsrfSafeAgent(
      'https',
      this.#options.allowedInternalHosts,
    );
    try {
      await this.#options.assertCurrent();
      const response = await axios.post<unknown>(
        `${connection.baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(connection.instanceName)}`,
        {
          message: {
            key: {
              id: input.providerMessageId,
              remoteJid: input.remoteJid,
              fromMe: input.fromMe,
            },
          },
          convertToMp4: false,
        },
        {
          headers: { apikey: connection.apiKey, Accept: 'application/json' },
          httpAgent,
          httpsAgent,
          proxy: false,
          maxRedirects: 0,
          timeout: this.#options.timeoutMs,
          signal: AbortSignal.timeout(this.#options.timeoutMs),
          maxContentLength: 24 * 1024 * 1024,
          maxBodyLength: 4096,
          validateStatus: () => true,
        },
      );
      const payload = z
        .object({
          base64: z
            .string()
            .min(4)
            .max(24 * 1024 * 1024)
            .regex(
              /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
            ),
          mimetype: z.string().max(80),
        })
        .safeParse(response.data);
      if (response.status !== 200 || !payload.success)
        throw new EvolutionMessageError('MEDIA_FETCH_FAILED');
      const bytes = Buffer.from(payload.data.base64, 'base64');
      const format = HERMES_MEDIA_FORMATS[input.kind];
      if (
        !bytes.length ||
        bytes.length > format.max ||
        !(format.mimes as readonly string[]).includes(payload.data.mimetype)
      )
        throw new EvolutionMessageError('MEDIA_CONTENT_UNSUPPORTED');
      await this.#options.assertCurrent();
      return { bytes, mimeType: payload.data.mimetype };
    } catch (error) {
      if (error instanceof EvolutionMessageError) throw error;
      throw new EvolutionMessageError('MEDIA_FETCH_FAILED');
    } finally {
      httpAgent.destroy();
      httpsAgent.destroy();
    }
  }

  // The core must reserve its durable clientRequestId before calling send.
  // Evolution has no documented idempotency key; an uncertain POST is never retried.
  async send(input: EvolutionMessageInput): Promise<{
    providerMessageId: string;
    acceptedAt: string;
  }> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success || (!input.media && !input.text.trim()))
      throw new EvolutionMessageError('INVALID_INPUT');
    const connection = this.#connections[input.workspaceId];
    if (!connection) throw new EvolutionMessageError('NOT_CONFIGURED');
    if (
      input.providerConnectionId !== evolutionProviderConnectionId(connection)
    )
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    const readiness = input.media
      ? await this.probe(input.workspaceId)
      : {
          status:
            (await this.#probe.probe(input.workspaceId)).status ===
            'PROVIDER_REPORTED_OPEN'
              ? 'AVAILABLE'
              : 'UNAVAILABLE',
          canSendMedia: false,
        };
    if (readiness.status !== 'AVAILABLE')
      throw new EvolutionMessageError('PROVIDER_UNAVAILABLE');
    if (input.media) {
      const format = HERMES_MEDIA_FORMATS[input.media.kind];
      if (!readiness.canSendMedia)
        throw new EvolutionMessageError('MEDIA_PROVIDER_NOT_VERIFIED');
      if (
        !input.media.bytes.length ||
        input.media.bytes.length > format.max ||
        !(format.mimes as readonly string[]).includes(input.media.mimeType)
      )
        throw new EvolutionMessageError('INVALID_INPUT');
    }

    const httpAgent = createSsrfSafeAgent(
      'http',
      this.#options.allowedInternalHosts,
    );
    const httpsAgent = createSsrfSafeAgent(
      'https',
      this.#options.allowedInternalHosts,
    );
    try {
      await this.#options.assertCurrent();
      const response = await axios.post<unknown>(
        `${connection.baseUrl}/message/${input.media?.kind === 'AUDIO' ? 'sendWhatsAppAudio' : input.media ? 'sendMedia' : 'sendText'}/${encodeURIComponent(connection.instanceName)}`,
        input.media?.kind === 'AUDIO'
          ? {
              number: input.contactHandle.split('@')[0],
              audio: input.media.bytes.toString('base64'),
            }
          : input.media
            ? {
                number: input.contactHandle.split('@')[0],
                mediatype: input.media.kind.toLowerCase(),
                mimetype: input.media.mimeType,
                caption: input.text,
                fileName: input.media.filename,
                media: input.media.bytes.toString('base64'),
              }
            : {
                number: input.contactHandle.split('@')[0],
                text: input.text,
                linkPreview: false,
              },
        {
          headers: { apikey: connection.apiKey, Accept: 'application/json' },
          httpAgent,
          httpsAgent,
          proxy: false,
          maxRedirects: 0,
          timeout: this.#options.timeoutMs,
          signal: AbortSignal.timeout(this.#options.timeoutMs),
          maxContentLength: 16_384,
          maxBodyLength: input.media ? 24 * 1024 * 1024 : 32_768,
          validateStatus: () => true,
        },
      );
      if (response.status === 401 || response.status === 403)
        throw new EvolutionMessageError('AUTHENTICATION_FAILED');
      if (response.status < 200 || response.status >= 300)
        throw new EvolutionMessageError('DELIVERY_UNCERTAIN');
      const accepted = acceptedSchema.safeParse(response.data);
      if (
        !accepted.success ||
        !(
          accepted.data.key.remoteJid === input.contactHandle ||
          (EVOLUTION_LID_JID.test(accepted.data.key.remoteJid) &&
            accepted.data.key.remoteJidAlt === input.contactHandle)
        )
      )
        throw new EvolutionMessageError('DELIVERY_UNCERTAIN');

      return {
        providerMessageId: accepted.data.key.id,
        acceptedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof EvolutionMessageError) throw error;
      // Axios errors may contain credentials and content. Never expose a cause.
      throw new EvolutionMessageError('DELIVERY_UNCERTAIN');
    } finally {
      httpAgent.destroy();
      httpsAgent.destroy();
    }
  }
}
