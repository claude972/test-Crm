import axios from 'axios';
import { z } from 'zod';

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
    .min(1)
    .max(4096)
    .refine((value) => !value.includes('\0')),
  clientRequestId: z.string().min(1).max(128),
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
    };
    this.#probe = new EvolutionConnectionAdapter(
      serializedConnections,
      this.#options,
    );
  }

  async probe(workspaceId: string): Promise<{
    status: 'NOT_CONFIGURED' | 'AVAILABLE' | 'UNAVAILABLE';
    errorCode?: string;
  }> {
    const result = await this.#probe.probe(workspaceId);

    if (result.status === 'NOT_CONFIGURED') return { status: 'NOT_CONFIGURED' };
    if (result.status === 'PROVIDER_REPORTED_OPEN')
      return { status: 'AVAILABLE' };

    return {
      status: 'UNAVAILABLE',
      errorCode: result.errorCode ?? result.status,
    };
  }

  // The core must reserve its durable clientRequestId before calling send.
  // Evolution has no documented idempotency key; an uncertain POST is never retried.
  async send(input: EvolutionMessageInput): Promise<{
    providerMessageId: string;
    acceptedAt: string;
  }> {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) throw new EvolutionMessageError('INVALID_INPUT');
    const connection = this.#connections[input.workspaceId];
    if (!connection) throw new EvolutionMessageError('NOT_CONFIGURED');
    if (
      input.providerConnectionId !== evolutionProviderConnectionId(connection)
    )
      throw new EvolutionMessageError('CONNECTION_MISMATCH');
    if ((await this.probe(input.workspaceId)).status !== 'AVAILABLE')
      throw new EvolutionMessageError('PROVIDER_UNAVAILABLE');

    const httpAgent = createSsrfSafeAgent(
      'http',
      this.#options.allowedInternalHosts,
    );
    const httpsAgent = createSsrfSafeAgent(
      'https',
      this.#options.allowedInternalHosts,
    );
    try {
      const response = await axios.post<unknown>(
        `${connection.baseUrl}/message/sendText/${encodeURIComponent(connection.instanceName)}`,
        {
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
          maxBodyLength: 32_768,
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
