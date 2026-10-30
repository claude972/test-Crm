import { randomBytes } from 'node:crypto';
import { Agent as HttpsAgent } from 'node:https';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from 'node:http';
import { type Socket } from 'node:net';

import { EvolutionConnectionAdapter } from '../evolution-connection.adapter';

const WORKSPACE_A = '4123ec08-5c6a-4ea4-8d55-5aac3c963dc2';
const WORKSPACE_B = '2c29b2f0-ceb5-4933-a542-9e0cc8b1ee61';
const WORKSPACE_C = 'e993f292-7557-432b-b312-d630ce35c5a3';
const API_KEY_A = randomBytes(32).toString('hex');
const API_KEY_B = randomBytes(32).toString('hex');

jest.setTimeout(30_000);

describe('EvolutionConnectionAdapter with a synthetic loopback HTTP provider', () => {
  let server: Server;
  let origin: string;
  let handler: (request: IncomingMessage, response: ServerResponse) => void;
  const sockets = new Set<Socket>();
  let requests: {
    url: string;
    key: string | string[] | undefined;
    method: string | undefined;
  }[];

  const config = (overrides = {}) =>
    JSON.stringify({
      [WORKSPACE_A]: {
        baseUrl: origin,
        instanceName: 'tenant-a',
        apiKey: API_KEY_A,
        ...overrides,
      },
      [WORKSPACE_B]: {
        baseUrl: origin,
        instanceName: 'tenant-b',
        apiKey: API_KEY_B,
      },
    });
  const adapter = (timeoutMs = 1000) =>
    new EvolutionConnectionAdapter(config(), {
      allowedInternalHosts: ['127.0.0.1'],
      timeoutMs,
    });
  const reply = (
    response: ServerResponse,
    state: string,
    instanceName = 'tenant-a',
  ) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ instance: { instanceName, state } }));
  };

  beforeEach(async () => {
    jest.useRealTimers();
    requests = [];
    handler = (_request, response) => reply(response, 'open');
    server = createServer((request, response) => {
      requests.push({
        url: request.url ?? '',
        key: request.headers.apikey,
        method: request.method,
      });
      handler(request, response);
    });
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing fixture address');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Fixture cleanup timeout')),
        5000,
      );
      server.close((error) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it.each([
    ['open', 'CONNECTED'],
    ['close', 'DISCONNECTED'],
    ['connecting', 'CONNECTING'],
  ])('maps only a real valid %s response to %s', async (state, status) => {
    handler = (_request, response) => reply(response, state);
    const result = await adapter().probe(WORKSPACE_A);
    expect(result).toMatchObject({
      workspaceId: WORKSPACE_A,
      provider: 'EVOLUTION',
      status,
      providerState: state,
      errorCode: null,
    });
    expect(Number.isFinite(Date.parse(result.checkedAt))).toBe(true);
    expect(requests).toEqual([
      {
        url: '/instance/connectionState/tenant-a',
        key: API_KEY_A,
        method: 'GET',
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(API_KEY_A);
    expect(JSON.stringify(result)).not.toContain(origin);
  });

  it('uses only the requested workspace instance/key and never enumerates instances', async () => {
    handler = (request, response) =>
      reply(
        response,
        'open',
        request.url?.endsWith('tenant-b') ? 'tenant-b' : 'tenant-a',
      );
    const client = adapter();
    await client.probe(WORKSPACE_A);
    await client.probe(WORKSPACE_B);
    expect(requests.map(({ url, key }) => ({ url, key }))).toEqual([
      { url: '/instance/connectionState/tenant-a', key: API_KEY_A },
      { url: '/instance/connectionState/tenant-b', key: API_KEY_B },
    ]);
  });

  it('returns NOT_CONFIGURED without networking for an unconfigured workspace', async () => {
    expect(await adapter().probe(WORKSPACE_C)).toMatchObject({
      status: 'NOT_CONFIGURED',
      providerState: null,
      errorCode: null,
    });
    expect(requests).toHaveLength(0);
  });

  it('rejects invalid workspace identifiers before networking', async () => {
    await expect(adapter().probe('../tenant-a')).rejects.toThrow(
      'A valid workspace identifier is required',
    );
    expect(requests).toHaveLength(0);
  });

  it.each([401, 403, 404, 500, 503])(
    'sanitizes provider HTTP %i without exposing its body or key',
    async (status) => {
      handler = (_request, response) => {
        response.statusCode = status;
        response.end(`${API_KEY_A} private provider diagnostics ${origin}`);
      };
      const result = await adapter().probe(WORKSPACE_A);
      expect(result.status).toBe('UNAVAILABLE');
      expect(result.errorCode).toBe(
        status === 401 || status === 403
          ? 'AUTHENTICATION_FAILED'
          : status === 404
            ? 'INSTANCE_NOT_FOUND'
            : 'PROVIDER_ERROR',
      );
      expect(result.providerState).toBeNull();
      expect(JSON.stringify(result)).not.toMatch(
        new RegExp(`${API_KEY_A}|private provider diagnostics|127\\.0\\.0\\.1`),
      );
    },
  );

  it.each([
    { instance: { instanceName: 'other-tenant', state: 'open' } },
    { instance: { instanceName: 'tenant-a', state: 'unknown' } },
    { instance: { instanceName: 'tenant-a' } },
    { state: 'open' },
    '<html>provider login page</html>',
  ])('fails closed on an invalid or mismatched 200 response', async (body) => {
    handler = (_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    expect(await adapter().probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'INVALID_RESPONSE',
      providerState: null,
    });
  });

  it('never follows a redirect or forwards credentials to its destination', async () => {
    handler = (_request, response) => {
      response.writeHead(302, { Location: `${origin}/credential-capture` });
      response.end();
    };
    expect(await adapter().probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'PROVIDER_ERROR',
    });
    expect(requests.map(({ url }) => url)).toEqual([
      '/instance/connectionState/tenant-a',
    ]);
  });

  it('times out a provider that never responds', async () => {
    handler = () => {};
    const started = Date.now();
    expect(await adapter(50).probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'TIMEOUT',
    });
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('bounds provider response size and returns no reflected payload', async () => {
    handler = (_request, response) => response.end(API_KEY_A.repeat(1000));
    expect(await adapter().probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'REQUEST_FAILED',
    });
  });

  it('does not retain a stale connected state after the provider fails', async () => {
    const client = adapter();
    expect((await client.probe(WORKSPACE_A)).status).toBe('CONNECTED');
    handler = (_request, response) => {
      response.statusCode = 503;
      response.end();
    };
    expect(await client.probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      providerState: null,
    });
  });

  it('blocks loopback by default even when configured and permits it only through an exact operator exception', async () => {
    expect(
      await new EvolutionConnectionAdapter(config()).probe(WORKSPACE_A),
    ).toMatchObject({ status: 'UNAVAILABLE', errorCode: 'REQUEST_FAILED' });
    expect(requests).toHaveLength(0);
    expect((await adapter().probe(WORKSPACE_A)).status).toBe('CONNECTED');
  });

  it('blocks private DNS resolution without a host exception', async () => {
    const client = new EvolutionConnectionAdapter(
      config({
        baseUrl: origin.replace('http://127.0.0.1', 'https://localhost'),
      }),
    );
    expect(await client.probe(WORKSPACE_A)).toMatchObject({
      status: 'UNAVAILABLE',
      errorCode: 'REQUEST_FAILED',
    });
    expect(requests).toHaveLength(0);
  });

  it.each(['https://169.254.169.254', 'https://[::ffff:169.254.169.254]'])(
    'blocks metadata target %s even with an operator host exception',
    async (baseUrl) => {
      const hostname = new URL(baseUrl).hostname;
      const client = new EvolutionConnectionAdapter(config({ baseUrl }), {
        allowedInternalHosts: [hostname],
        timeoutMs: 100,
      });
      const connect = jest
        .spyOn(HttpsAgent.prototype, 'createConnection')
        .mockImplementation(() => {
          throw new Error('Metadata network access must never start');
        });
      try {
        expect(await client.probe(WORKSPACE_A)).toMatchObject({
          status: 'UNAVAILABLE',
          errorCode: 'REQUEST_FAILED',
        });
        expect(connect).not.toHaveBeenCalled();
        expect(requests).toHaveLength(0);
      } finally {
        connect.mockRestore();
      }
    },
  );

  it.each([
    { baseUrl: 'http://public.example.test' },
    { baseUrl: 'https://user:secret@example.test' },
    { baseUrl: 'https://example.test/path' },
    { baseUrl: 'https://example.test?apikey=secret' },
    { instanceName: '../other' },
    { instanceName: 'other?admin=true' },
    { apiKey: 'key\r\nInjected: value' },
    { unexpected: 'secret' },
  ])(
    'refuses unsafe configuration with a generic secret-safe error',
    (change) => {
      expect(() => new EvolutionConnectionAdapter(config(change))).toThrow(
        'Evolution workspace configuration is invalid',
      );
      expect(requests).toHaveLength(0);
    },
  );

  it.each([0, 9, 10_001, Number.NaN])(
    'rejects timeout %s outside bounds',
    (timeoutMs) => {
      expect(
        () => new EvolutionConnectionAdapter(config(), { timeoutMs }),
      ).toThrow('Evolution timeout must be between');
    },
  );

  it('rejects a blanket internal-host exception and hides configured credentials from serialization', () => {
    expect(
      () =>
        new EvolutionConnectionAdapter(config(), {
          allowedInternalHosts: ['*'],
        }),
    ).toThrow('must be exact');
    expect(JSON.stringify(adapter())).not.toContain(API_KEY_A);
    expect(
      () => new EvolutionConnectionAdapter(`{"secret":"${API_KEY_A}"}`),
    ).toThrow('Evolution workspace configuration is invalid');
  });

  it('rejects a provider instance shared by different workspace configurations', () => {
    const duplicate = JSON.stringify({
      [WORKSPACE_A]: {
        baseUrl: origin,
        instanceName: 'shared',
        apiKey: API_KEY_A,
      },
      [WORKSPACE_B]: {
        baseUrl: origin,
        instanceName: 'shared',
        apiKey: API_KEY_B,
      },
    });
    expect(() => new EvolutionConnectionAdapter(duplicate)).toThrow(
      'Evolution workspace configuration is invalid',
    );
    expect(requests).toHaveLength(0);
  });
});
