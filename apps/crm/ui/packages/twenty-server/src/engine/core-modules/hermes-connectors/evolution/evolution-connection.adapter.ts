import axios from 'axios';
import { z } from 'zod';

import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';

import {
  parseEvolutionConnections,
  type EvolutionConnection,
} from './evolution-connection.schema';
import {
  type EvolutionConnectionProbe,
  type EvolutionProbeStatus,
} from './evolution-connection-probe.type';

const responseSchema = z.object({
  instance: z.object({
    instanceName: z.string(),
    state: z.enum(['open', 'close', 'connecting']),
  }),
});
const STATUS_BY_STATE: Record<
  'open' | 'close' | 'connecting',
  EvolutionProbeStatus
> = {
  open: 'CONNECTED',
  close: 'DISCONNECTED',
  connecting: 'CONNECTING',
};

type EvolutionAdapterOptions = {
  timeoutMs?: number;
  // Exact, operator-owned exceptions; never obtained from GraphQL or config JSON.
  allowedInternalHosts?: string[];
};

export class EvolutionConnectionAdapter {
  readonly #connections: Record<string, EvolutionConnection>;
  private readonly timeoutMs: number;
  private readonly allowedInternalHosts: string[];

  constructor(
    serializedConnections: string,
    options: EvolutionAdapterOptions = {},
  ) {
    this.#connections = parseEvolutionConnections(serializedConnections);
    this.timeoutMs = options.timeoutMs ?? 3000;
    if (
      !Number.isInteger(this.timeoutMs) ||
      this.timeoutMs < 10 ||
      this.timeoutMs > 10_000
    )
      throw new Error(
        'Evolution timeout must be between 10 and 10000 milliseconds',
      );
    this.allowedInternalHosts = [...(options.allowedInternalHosts ?? [])];
    if (
      this.allowedInternalHosts.some(
        (host) => !/^[a-z0-9.:[\]-]+$/.test(host) || host === '*',
      )
    )
      throw new Error(
        'Evolution internal host exceptions must be exact hostnames',
      );
  }

  // Call only after the existing auth/role guard has authorized this workspace.
  async probe(workspaceId: string): Promise<EvolutionConnectionProbe> {
    if (!z.string().uuid().safeParse(workspaceId).success)
      throw new Error('A valid workspace identifier is required');
    const base: EvolutionConnectionProbe = {
      workspaceId,
      provider: 'EVOLUTION',
      status: 'NOT_CONFIGURED',
      providerState: null,
      checkedAt: new Date().toISOString(),
      errorCode: null,
    };
    const connection = this.#connections[workspaceId];
    if (!connection) return base;
    const httpAgent = createSsrfSafeAgent('http', this.allowedInternalHosts);
    const httpsAgent = createSsrfSafeAgent('https', this.allowedInternalHosts);
    try {
      const response = await axios.get<unknown>(
        `${connection.baseUrl}/instance/connectionState/${encodeURIComponent(connection.instanceName)}`,
        {
          headers: { apikey: connection.apiKey, Accept: 'application/json' },
          httpAgent,
          httpsAgent,
          proxy: false,
          maxRedirects: 0,
          timeout: this.timeoutMs,
          signal: AbortSignal.timeout(this.timeoutMs),
          maxContentLength: 16_384,
          maxBodyLength: 0,
          validateStatus: () => true,
        },
      );
      if (response.status === 401 || response.status === 403)
        return {
          ...base,
          status: 'UNAVAILABLE',
          errorCode: 'AUTHENTICATION_FAILED',
        };
      if (response.status === 404)
        return {
          ...base,
          status: 'UNAVAILABLE',
          errorCode: 'INSTANCE_NOT_FOUND',
        };
      if (response.status !== 200)
        return { ...base, status: 'UNAVAILABLE', errorCode: 'PROVIDER_ERROR' };
      const parsed = responseSchema.safeParse(response.data);
      if (
        !parsed.success ||
        parsed.data.instance.instanceName !== connection.instanceName
      )
        return {
          ...base,
          status: 'UNAVAILABLE',
          errorCode: 'INVALID_RESPONSE',
        };
      const state = parsed.data.instance.state;
      return { ...base, status: STATUS_BY_STATE[state], providerState: state };
    } catch (error) {
      // Axios errors contain request headers and provider bodies: return no cause.
      const timeout =
        axios.isAxiosError(error) &&
        ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(
          error.code ?? '',
        );
      return {
        ...base,
        status: 'UNAVAILABLE',
        errorCode: timeout ? 'TIMEOUT' : 'REQUEST_FAILED',
      };
    } finally {
      httpAgent.destroy();
      httpsAgent.destroy();
    }
  }
}
