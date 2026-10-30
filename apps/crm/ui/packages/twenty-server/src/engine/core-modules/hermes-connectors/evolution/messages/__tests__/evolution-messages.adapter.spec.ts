import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { type Socket } from 'node:net';

import { EvolutionMessagesAdapter } from '../evolution-messages.adapter';
import { evolutionProviderConnectionId } from '../evolution-message.types';

const WORKSPACE = '4123ec08-5c6a-4ea4-8d55-5aac3c963dc2';
const OTHER = '2c29b2f0-ceb5-4933-a542-9e0cc8b1ee61';
const SECRET = randomBytes(32).toString('hex');
const JID = '33612345678@s.whatsapp.net';

jest.setTimeout(30_000);

describe('Evolution messages with a synthetic loopback provider, never WhatsApp', () => {
  let server: Server;
  let origin: string;
  let state: string;
  let responseJid: string;
  let responseJidAlt: string | undefined;
  let sendStatus: number;
  let malformed: boolean;
  let hang: boolean;
  let requests: { url: string; method: string; key: unknown; body: unknown }[];
  const sockets = new Set<Socket>();
  const connection = () => ({
    baseUrl: origin,
    instanceName: 'tenant-a',
    apiKey: SECRET,
  });
  const config = () => JSON.stringify({ [WORKSPACE]: connection() });
  const adapter = (timeoutMs = 500) =>
    new EvolutionMessagesAdapter(config(), {
      timeoutMs,
      allowedInternalHosts: ['127.0.0.1'],
    });
  const input = () => ({
    workspaceId: WORKSPACE,
    conversationId: OTHER,
    providerConnectionId: evolutionProviderConnectionId(connection()),
    contactHandle: JID,
    text: 'Synthetic loopback only',
    clientRequestId: 'request-1',
  });

  beforeEach(async () => {
    state = 'open';
    responseJid = JID;
    responseJidAlt = undefined;
    sendStatus = 201;
    malformed = false;
    hang = false;
    requests = [];
    server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks).toString();
      requests.push({
        url: request.url ?? '',
        method: request.method ?? '',
        key: request.headers.apikey,
        body: body ? JSON.parse(body) : null,
      });
      response.setHeader('Content-Type', 'application/json');
      if (request.method === 'GET') {
        response.end(
          JSON.stringify({ instance: { instanceName: 'tenant-a', state } }),
        );
      } else if (!hang) {
        response.statusCode = sendStatus;
        if (sendStatus === 302)
          response.setHeader('Location', `${origin}/must-not-follow`);
        response.end(
          JSON.stringify(
            malformed
              ? { secret: SECRET }
              : {
                  key: {
                    id: 'provider-message-1',
                    fromMe: true,
                    remoteJid: responseJid,
                    remoteJidAlt: responseJidAlt,
                  },
                  status: 'PENDING',
                },
          ),
        );
      }
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
      throw new Error('Fixture address unavailable');
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Fixture cleanup exceeded 5 seconds')),
        5000,
      );
      server.close((error) => {
        clearTimeout(timeout);
        error ? reject(error) : resolve();
      });
    });
  });

  it('checks the actual connection then posts the real v2 text contract and reports acceptance only', async () => {
    const result = await adapter().send(input());
    expect(result).toEqual({
      providerMessageId: 'provider-message-1',
      acceptedAt: expect.any(String),
    });
    expect(result).not.toHaveProperty('delivered');
    expect(requests).toEqual([
      {
        url: '/instance/connectionState/tenant-a',
        method: 'GET',
        key: SECRET,
        body: null,
      },
      {
        url: '/message/sendText/tenant-a',
        method: 'POST',
        key: SECRET,
        body: {
          number: '33612345678',
          text: 'Synthetic loopback only',
          linkPreview: false,
        },
      },
    ]);
    expect(JSON.stringify(adapter())).not.toContain(SECRET);
  });
  it('accepts a provider LID acknowledgement only with its explicit target phone mapping', async () => {
    responseJid = '987654321@lid';
    responseJidAlt = JID;
    await expect(adapter().send(input())).resolves.toMatchObject({
      providerMessageId: 'provider-message-1',
    });
  });
  it('does not accept a LID acknowledgement mapped to a different contact', async () => {
    responseJid = '987654321@lid';
    responseJidAlt = '33600000000@s.whatsapp.net';
    await expect(adapter().send(input())).rejects.toMatchObject({
      code: 'DELIVERY_UNCERTAIN',
    });
  });
  it('returns explicitly NOT_CONFIGURED without HTTP for another workspace', async () => {
    expect(await adapter().probe(OTHER)).toEqual({ status: 'NOT_CONFIGURED' });
    await expect(
      adapter().send({ ...input(), workspaceId: OTHER }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    expect(requests).toHaveLength(0);
  });
  it.each(['close', 'connecting', 'invalid'])(
    'does not send when real provider state is %s',
    async (providerState) => {
      state = providerState;
      await expect(adapter().send(input())).rejects.toMatchObject({
        code: 'PROVIDER_UNAVAILABLE',
      });
      expect(requests.every(({ method }) => method === 'GET')).toBe(true);
    },
  );
  it('rejects a connection identifier from a different workspace before HTTP', async () => {
    await expect(
      adapter().send({
        ...input(),
        providerConnectionId: `evolution:${'a'.repeat(64)}`,
      }),
    ).rejects.toMatchObject({ code: 'CONNECTION_MISMATCH' });
    expect(requests).toHaveLength(0);
  });
  it.each([
    '33612345678@g.us',
    '123@lid',
    '../api',
    '+33612345678',
    '33612345678:12@s.whatsapp.net',
  ])(
    'rejects unsupported or unsafe recipient %s without HTTP',
    async (contactHandle) => {
      await expect(
        adapter().send({ ...input(), contactHandle }),
      ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
      expect(requests).toHaveLength(0);
    },
  );
  it.each(['', 'x'.repeat(4097), 'null\0byte'])(
    'rejects invalid text without HTTP',
    async (text) => {
      await expect(adapter().send({ ...input(), text })).rejects.toMatchObject({
        code: 'INVALID_INPUT',
      });
      expect(requests).toHaveLength(0);
    },
  );
  it.each([401, 403])(
    'handles explicit provider rejection %s safely',
    async (status) => {
      sendStatus = status;
      await expect(adapter().send(input())).rejects.toMatchObject({
        code:
          status === 401 || status === 403
            ? 'AUTHENTICATION_FAILED'
            : 'PROVIDER_REJECTED',
      });
      expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(
        1,
      );
      expect(requests.some(({ url }) => url.includes('must-not-follow'))).toBe(
        false,
      );
    },
  );
  it.each([302, 400, 404, 422, 429, 500, 503])(
    'does not retry or follow provider status %s',
    async (status) => {
      sendStatus = status;
      await expect(adapter().send(input())).rejects.toMatchObject({
        code: 'DELIVERY_UNCERTAIN',
      });
      expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(
        1,
      );
      expect(requests.some(({ url }) => url.includes('must-not-follow'))).toBe(
        false,
      );
    },
  );
  it('does not expose malformed provider data or secrets as a false success', async () => {
    malformed = true;
    try {
      await adapter().send(input());
      throw new Error('Expected failure');
    } catch (error) {
      expect(error).toMatchObject({ code: 'DELIVERY_UNCERTAIN' });
      expect(String(error)).not.toContain(SECRET);
      expect(error).not.toHaveProperty('cause');
    }
  });
  it('marks a timed-out POST uncertain and never retries', async () => {
    hang = true;
    await expect(adapter(100).send(input())).rejects.toMatchObject({
      code: 'DELIVERY_UNCERTAIN',
    });
    expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(1);
  });
  it('blocks a private target before a socket without operator-owned fixture exception', async () => {
    const blocked = new EvolutionMessagesAdapter(config(), { timeoutMs: 200 });
    await expect(blocked.send(input())).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
    });
    expect(requests).toHaveLength(0);
  });
  it.each([-1, 0, 10001])('rejects invalid timeout %s', (timeoutMs) => {
    expect(() => adapter(timeoutMs)).toThrow('Evolution timeout');
  });
});
