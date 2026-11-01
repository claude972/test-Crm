import axios from 'axios';
import { EvolutionEnrollmentClient } from '../evolution-enrollment.client';
import { createSsrfSafeAgent } from 'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util';
jest.mock('axios', () => ({
  __esModule: true,
  default: { request: jest.fn() },
}));
jest.mock(
  'src/engine/core-modules/secure-http-client/utils/create-ssrf-safe-agent.util',
  () => ({ createSsrfSafeAgent: jest.fn(() => ({})) }),
);
const operator = {
  baseUrl: 'https://managed.test:8443',
  hostname: 'managed.test',
  apiKey: 'operator-private-key',
};
const name = 'kcrm-fixture';
const request = jest.mocked(axios.request);
const response = (data: unknown) => request.mockResolvedValueOnce({ data });
beforeEach(() => jest.clearAllMocks());
describe('managed provider protocol without real provider calls', () => {
  it('checks version and absence before a single create, with webhook/history disabled', async () => {
    response({ version: '2.3.6' });
    response([]);
    response({
      instance: { instanceName: name },
      hash: 'instance-private-token',
    });
    const current = jest.fn(async () => {});
    await new EvolutionEnrollmentClient(operator, current).create(
      name,
      'instance-private-token',
    );
    expect(request).toHaveBeenCalledTimes(3);
    expect(current).toHaveBeenCalledTimes(6);
    const create = request.mock.calls[2][0];
    expect(create).toMatchObject({
      method: 'POST',
      url: operator.baseUrl + '/instance/create',
      headers: { apikey: operator.apiKey },
      maxRedirects: 0,
      proxy: false,
      timeout: 10000,
      data: {
        token: 'instance-private-token',
        qrcode: false,
        syncFullHistory: false,
      },
    });
    expect(create.data).not.toHaveProperty('webhook');
    expect(createSsrfSafeAgent).toHaveBeenCalledWith('https', ['managed.test']);
  });
  it('never calls destructive create for an existing provider name', async () => {
    response({ version: '2.3.6' });
    response([{ name }]);
    await expect(
      new EvolutionEnrollmentClient(operator).create(name, 'instance'),
    ).rejects.toThrow('WA_INSTANCE_ALREADY_EXISTS');
    expect(
      request.mock.calls.every(([config]) => config!.method === 'GET'),
    ).toBe(true);
  });
  it('makes no automatic retry after an ambiguous create response and hides raw causes', async () => {
    response({ version: '2.3.6' });
    response([]);
    request.mockRejectedValueOnce(new Error('sensitive-provider-body-and-key'));
    await expect(
      new EvolutionEnrollmentClient(operator).create(name, 'instance'),
    ).rejects.toThrow(/^WA_PROVIDER_UNAVAILABLE$/);
    expect(
      request.mock.calls.filter(([config]) => config!.method === 'POST'),
    ).toHaveLength(1);
  });
  it('requires exact version and exact response binding', async () => {
    response({ version: 'latest' });
    await expect(
      new EvolutionEnrollmentClient(operator).create(name, 'instance'),
    ).rejects.toThrow('WA_PROVIDER_VERSION_UNSUPPORTED');
    response({ instance: { instanceName: 'other-tenant', state: 'open' } });
    await expect(
      new EvolutionEnrollmentClient(operator).status(name, 'instance'),
    ).rejects.toThrow('WA_PROVIDER_UNAVAILABLE');
  });
  it('preserves authorization failures before and after provider I/O', async () => {
    const denied = new Error('DENIED');
    const guard = jest.fn(async () => {}).mockRejectedValueOnce(denied);
    await expect(
      new EvolutionEnrollmentClient(operator, guard).status(name, 'instance'),
    ).rejects.toBe(denied);
    expect(request).not.toHaveBeenCalled();
    response({ instance: { instanceName: name, state: 'open' } });
    guard.mockResolvedValueOnce(undefined).mockRejectedValueOnce(denied);
    await expect(
      new EvolutionEnrollmentClient(operator, guard).status(name, 'instance'),
    ).rejects.toBe(denied);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not accept an enabled or malformed pre-pairing webhook', async () => {
    response({ enabled: true });
    await expect(
      new EvolutionEnrollmentClient(operator).webhookDisabled(name, 'instance'),
    ).rejects.toThrow('WA_INGRESS_UNCONFIRMED');
    response(null);
    await expect(
      new EvolutionEnrollmentClient(operator).webhookDisabled(name, 'instance'),
    ).resolves.toBeUndefined();
  });
  it('returns pairing code only for an explicitly supplied private number', async () => {
    response({ pairingCode: 'ABCD-1234' });
    await expect(
      new EvolutionEnrollmentClient(operator).qr(
        name,
        'instance',
        '+33612345678',
      ),
    ).resolves.toEqual({ pairingCode: 'ABCD-1234' });
    expect(request.mock.calls[0][0]).toMatchObject({
      params: { number: '33612345678' },
      headers: { apikey: 'instance' },
    });
    response({ pairingCode: 'ABCD-1234' });
    await expect(
      new EvolutionEnrollmentClient(operator).qr(name, 'instance'),
    ).rejects.toThrow('WA_QR_UNAVAILABLE');
  });
  it.each([
    'https://provider.test/image',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:image/png;base64,iVBORw0KGgo=',
  ])('rejects non-PNG/truncated QR %s', async (base64) => {
    response({ base64 });
    await expect(
      new EvolutionEnrollmentClient(operator).qr(name, 'instance'),
    ).rejects.toThrow('WA_QR_UNAVAILABLE');
  });
  it('bounds decoded PNG dimensions and returns only a data image', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1cAAAAASUVORK5CYII=',
      'base64',
    );
    const base64 = 'data:image/png;base64,' + png.toString('base64');
    response({ base64 });
    await expect(
      new EvolutionEnrollmentClient(operator).qr(name, 'instance'),
    ).resolves.toEqual({ qrDataUrl: base64 });
    png.writeUInt32BE(100000, 16);
    response({ base64: 'data:image/png;base64,' + png.toString('base64') });
    await expect(
      new EvolutionEnrollmentClient(operator).qr(name, 'instance'),
    ).rejects.toThrow('WA_QR_UNAVAILABLE');
  });
  it('requires exact remote webhook confirmation rather than treating POST acceptance as active', async () => {
    const webhook = {
      url: 'https://crm.test/webhooks/hermes/evolution/id',
      secret: 'private-webhook-secret',
    };
    response({});
    response({
      enabled: true,
      url: webhook.url,
      headers: { 'x-hermes-evolution-token': webhook.secret },
      events: ['MESSAGES_UPSERT', 'SEND_MESSAGE'],
      webhookByEvents: false,
      webhookBase64: false,
    });
    await expect(
      new EvolutionEnrollmentClient(operator).activate(
        name,
        'instance',
        webhook,
      ),
    ).resolves.toBeUndefined();
    response({});
    response({
      enabled: true,
      url: webhook.url,
      headers: { 'x-hermes-evolution-token': webhook.secret },
      events: ['MESSAGES_UPSERT', 'SEND_MESSAGE'],
    });
    await expect(
      new EvolutionEnrollmentClient(operator).activate(
        name,
        'instance',
        webhook,
      ),
    ).rejects.toThrow('WA_INGRESS_UNCONFIRMED');
  });
});
