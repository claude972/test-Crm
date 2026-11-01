import axios from 'axios';
import { z } from 'zod';
import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';

export class EvolutionEnrollmentError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const stateSchema = z.object({
  instance: z.object({
    instanceName: z.string(),
    state: z.enum(['open', 'close', 'connecting']),
  }),
});
export class EvolutionEnrollmentClient {
  constructor(
    private readonly operator: {
      baseUrl: string;
      hostname: string;
      apiKey: string;
    },
    private readonly assertCurrent: () => Promise<void> = async () => {},
  ) {}
  private async request(
    method: 'GET' | 'POST',
    path: string,
    key?: string,
    data?: unknown,
    params?: Record<string, string>,
  ) {
    await this.assertCurrent();
    let result: unknown;
    try {
      const response = await axios.request<unknown>({
        method,
        url: this.operator.baseUrl + path,
        headers: key ? { apikey: key } : {},
        data,
        params,
        timeout: 10000,
        maxRedirects: 0,
        proxy: false,
        maxContentLength: 524288,
        maxBodyLength: 32768,
        responseType: 'json',
        httpAgent: createSsrfSafeAgent('http', [this.operator.hostname]),
        httpsAgent: createSsrfSafeAgent('https', [this.operator.hostname]),
      });
      result = response.data;
    } catch {
      throw new EvolutionEnrollmentError('WA_PROVIDER_UNAVAILABLE');
    }
    await this.assertCurrent();
    return result;
  }
  async create(instanceName: string, token: string) {
    const version = z
      .object({ version: z.literal('2.3.6') })
      .safeParse(await this.request('GET', '/'));
    if (!version.success)
      throw new EvolutionEnrollmentError('WA_PROVIDER_VERSION_UNSUPPORTED');
    const existing = await this.request(
      'GET',
      '/instance/fetchInstances',
      this.operator.apiKey,
      undefined,
      { instanceName },
    );
    if (!Array.isArray(existing))
      throw new EvolutionEnrollmentError('WA_PROVIDER_UNAVAILABLE');
    if (existing.length !== 0)
      throw new EvolutionEnrollmentError('WA_INSTANCE_ALREADY_EXISTS');
    const response = await this.request(
      'POST',
      '/instance/create',
      this.operator.apiKey,
      {
        instanceName,
        token,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: false,
        syncFullHistory: false,
        groupsIgnore: true,
        readMessages: false,
        readStatus: false,
        alwaysOnline: false,
        webhook: { enabled: false, events: [], byEvents: false, base64: false },
      },
    );
    const created = z
      .object({
        instance: z.object({ instanceName: z.literal(instanceName) }),
        hash: z.literal(token),
      })
      .safeParse(response);
    if (!created.success)
      throw new EvolutionEnrollmentError('WA_PROVISIONING_UNCONFIRMED');
  }
  async status(instanceName: string, token: string) {
    const value = stateSchema.safeParse(
      await this.request(
        'GET',
        '/instance/connectionState/' + encodeURIComponent(instanceName),
        token,
      ),
    );
    if (!value.success || value.data.instance.instanceName !== instanceName)
      throw new EvolutionEnrollmentError('WA_PROVIDER_UNAVAILABLE');
    return value.data.instance.state;
  }
  async webhookDisabled(instanceName: string, token: string) {
    const row = await this.request(
      'GET',
      '/webhook/find/' + encodeURIComponent(instanceName),
      token,
    );
    if (row === null) return;
    if (!z.object({ enabled: z.literal(false) }).safeParse(row).success)
      throw new EvolutionEnrollmentError('WA_INGRESS_UNCONFIRMED');
  }
  async qr(instanceName: string, token: string, phoneNumber?: string) {
    const response = await this.request(
      'GET',
      '/instance/connect/' + encodeURIComponent(instanceName),
      token,
      undefined,
      phoneNumber ? { number: phoneNumber.replace(/^\+/, '') } : undefined,
    );
    const value = z
      .object({
        base64: z.string().max(350000).optional(),
        pairingCode: z
          .string()
          .regex(/^[A-Za-z0-9-]{4,32}$/)
          .nullish(),
      })
      .safeParse(response);
    if (!value.success) throw new EvolutionEnrollmentError('WA_QR_UNAVAILABLE');
    const result: { qrDataUrl?: string; pairingCode?: string } = {};
    if (value.data.base64) {
      const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        value.data.base64,
      );
      const png = match ? Buffer.from(match[1], 'base64') : null;
      if (
        !match ||
        !png ||
        png.length < 33 ||
        png.toString('ascii', 12, 16) !== 'IHDR' ||
        png.readUInt32BE(16) < 1 ||
        png.readUInt32BE(16) > 2048 ||
        png.readUInt32BE(20) < 1 ||
        png.readUInt32BE(20) > 2048 ||
        !Buffer.from(match[1], 'base64')
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        throw new EvolutionEnrollmentError('WA_QR_UNAVAILABLE');
      result.qrDataUrl = value.data.base64;
    }
    if (phoneNumber && value.data.pairingCode)
      result.pairingCode = value.data.pairingCode;
    if (!result.qrDataUrl && !result.pairingCode)
      throw new EvolutionEnrollmentError('WA_QR_UNAVAILABLE');
    return result;
  }
  async activate(
    instanceName: string,
    token: string,
    webhook: { url: string; secret: string },
  ) {
    await this.request(
      'POST',
      '/webhook/set/' + encodeURIComponent(instanceName),
      token,
      {
        webhook: {
          enabled: true,
          url: webhook.url,
          headers: { 'x-hermes-evolution-token': webhook.secret },
          byEvents: false,
          base64: false,
          events: ['MESSAGES_UPSERT', 'SEND_MESSAGE'],
        },
      },
    );
    const row = z
      .object({
        enabled: z.literal(true),
        url: z.literal(webhook.url),
        headers: z.object({
          'x-hermes-evolution-token': z.literal(webhook.secret),
        }),
        webhookByEvents: z.literal(false),
        webhookBase64: z.literal(false),
        events: z.array(z.string()),
      })
      .safeParse(
        await this.request(
          'GET',
          '/webhook/find/' + encodeURIComponent(instanceName),
          token,
        ),
      );
    if (
      !row.success ||
      row.data.events.length !== 2 ||
      !['MESSAGES_UPSERT', 'SEND_MESSAGE'].every((event) =>
        row.data.events.includes(event),
      )
    )
      throw new EvolutionEnrollmentError('WA_INGRESS_UNCONFIRMED');
  }
}
