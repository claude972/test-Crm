import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  EvolutionWebhookController,
  EVOLUTION_WEBHOOK_RECEIVER,
} from '../evolution-webhook.controller';
import { EvolutionWebhookReceiver } from '../evolution-webhook.receiver';
import { EvolutionMessagesAdapter } from '../evolution-messages.adapter';
import {
  EvolutionMessageError,
  evolutionProviderConnectionId,
} from '../evolution-message.types';

// A DEMONSTRATION PROVIDER AND A DEMONSTRATION STORE, NOT A VERIFIED CONNECTOR.
//
// This exercises one inbound image the whole way through our own code: real Nest
// HTTP on loopback, the real controller, the real webhook receiver, the real
// Evolution media adapter fetching bytes by provider message key from a fake
// Evolution answering on 127.0.0.1, into a store double standing in for
// HermesMediaService (the real one needs PostgreSQL). It proves our path holds
// together and the guards fire. It is not provider access and not delivery
// proof, and must never be presented as a verified real connector.
//
// The connection lookup is also stood in for: HermesConnectedEvolutionReceiver
// resolves it from the database, so the wrapper below enforces the same
// connection-scoped rule without one.
jest.setTimeout(30_000);

const WORKSPACE = randomUUID();
const CONNECTION_ID = randomUUID();
const instanceName = 'fixture-reception';
const remoteJid = '33612345678@s.whatsapp.net';
const providerMessageId = 'fixture-inbound-image';
const image = Buffer.from('synthetic inbound image bytes for the fixture');

let app: INestApplication;
let origin: string;
let provider: Server;
let providerRequests: { method: string; path: string }[];
let apiKey = '';
let token = '';
let providerBaseUrl = '';
let ingested: Record<string, unknown>[];

// Stands in for HermesMediaService: keeps the bytes private, hands back only an
// asset id, and is idempotent on the provider message key so a replayed
// delivery cannot produce a second asset.
const store = new Map<string, { assetId: string; bytes: Buffer }>();
const mediaReceive = async (input: {
  workspaceId: string;
  providerMessageId: string;
  mimeType: string;
  bytes: Buffer;
}) => {
  const key = `${input.workspaceId}:${input.providerMessageId}`;
  const existing = store.get(key);

  if (existing) return { assetId: existing.assetId };

  const assetId = randomUUID();

  store.set(key, { assetId, bytes: input.bytes });

  return { assetId };
};

beforeEach(async () => {
  providerRequests = [];
  ingested = [];
  store.clear();
  apiKey = randomBytes(32).toString('hex');
  token = randomBytes(32).toString('hex');

  provider = createServer(async (req, res) => {
    for await (const chunk of req) void chunk;
    providerRequests.push({ method: req.method ?? '', path: req.url ?? '' });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/') return res.end(JSON.stringify({ version: '2.3.6' }));
    if (req.url === `/chat/getBase64FromMediaMessage/${instanceName}`)
      return res.end(
        JSON.stringify({
          mimetype: 'image/png',
          base64: image.toString('base64'),
        }),
      );
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((resolve) =>
    provider.listen(0, '127.0.0.1', resolve),
  );
  const address = provider.address();
  if (!address || typeof address === 'string')
    throw Error('Fixture address missing');
  providerBaseUrl = `http://127.0.0.1:${address.port}`;

  const serialized = JSON.stringify({
    [WORKSPACE]: { baseUrl: providerBaseUrl, instanceName, apiKey },
  });
  const messages = new EvolutionMessagesAdapter(serialized, {
    allowedInternalHosts: ['127.0.0.1'],
    timeoutMs: 500,
    ingressConnectionId: CONNECTION_ID,
  });
  const receiver = new EvolutionWebhookReceiver(
    serialized,
    JSON.stringify({ [WORKSPACE]: token }),
    async (event) => {
      ingested.push(event as unknown as Record<string, unknown>);

      return {
        conversationId: 'fixture-conversation',
        messageId: 'fixture-message',
        replay: false,
      };
    },
    async (input) => {
      // The translation HermesConnectedEvolutionAdapter.receiveMedia performs:
      // the receiver names the connection by its native id, and the provider
      // adapter is addressed by its derived provider connection id.
      if (input.providerConnectionId !== CONNECTION_ID)
        throw new EvolutionMessageError('CONNECTION_MISMATCH');

      const bytes = await messages.receiveMedia({
        ...input,
        providerConnectionId: evolutionProviderConnectionId({
          baseUrl: providerBaseUrl,
          instanceName,
        }),
      });

      return mediaReceive({ ...input, ...bytes });
    },
    { connectionId: CONNECTION_ID },
  );

  const module = await Test.createTestingModule({
    controllers: [EvolutionWebhookController],
    providers: [
      {
        provide: EVOLUTION_WEBHOOK_RECEIVER,
        useValue: {
          // The connection-scoped rule the real connected receiver enforces
          // from the database.
          receive: (
            suppliedToken: unknown,
            body: unknown,
            connectionId?: string,
          ) => {
            if (connectionId !== CONNECTION_ID)
              throw new EvolutionMessageError('WEBHOOK_UNAUTHORIZED');

            return receiver.receive(suppliedToken, body);
          },
        },
      },
    ],
  }).compile();

  app = module.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});

afterEach(async () => {
  await app?.close();
  provider.closeAllConnections();
  await new Promise<void>((resolve) => provider.close(() => resolve()));
});

const imageEvent = () => ({
  event: 'messages.upsert',
  instance: instanceName,
  data: {
    key: { id: providerMessageId, remoteJid, fromMe: false },
    message: { imageMessage: { caption: 'Une photo' } },
    messageTimestamp: Math.floor(Date.now() / 1000),
  },
});

const deliver = (
  suppliedToken: string | undefined,
  body: unknown,
  connectionId: string = CONNECTION_ID,
) =>
  fetch(`${origin}/webhooks/hermes/evolution/${connectionId}`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: {
      'Content-Type': 'application/json',
      ...(suppliedToken ? { 'x-hermes-evolution-token': suppliedToken } : {}),
    },
    body: JSON.stringify(body),
  });

describe('One inbound image, over real HTTP, through to a private store', () => {
  it('fetches the bytes by provider key and stores them privately, exposing no bytes or URL', async () => {
    const response = await deliver(token, imageEvent());

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ status: 'INGESTED' });

    // The bytes came from the authenticated stored-message route, not from any
    // webhook-supplied URL or media key.
    expect(providerRequests).toEqual([
      { method: 'GET', path: '/' },
      {
        method: 'POST',
        path: `/chat/getBase64FromMediaMessage/${instanceName}`,
      },
    ]);

    // Stored privately: the asset exists with the exact bytes, and the ingested
    // event carries only its id.
    expect(store.size).toBe(1);
    const stored = [...store.values()][0];

    expect(stored.bytes).toEqual(image);
    expect(ingested).toHaveLength(1);
    expect(ingested[0]).toMatchObject({
      workspaceId: WORKSPACE,
      channel: 'WHATSAPP',
      direction: 'INBOUND',
      kind: 'IMAGE',
      providerMessageId,
      mediaAssetId: stored.assetId,
      text: 'Une photo',
    });
    expect(JSON.stringify(ingested[0])).not.toContain(
      image.toString('base64'),
    );
    expect(JSON.stringify(ingested[0])).not.toContain(apiKey);
    expect(JSON.stringify(ingested[0])).not.toContain(token);
  });

  it('stores nothing and contacts no provider for a forged delivery token', async () => {
    const response = await deliver(randomBytes(32).toString('hex'), imageEvent());

    expect(response.status).toBe(401);
    expect(providerRequests).toHaveLength(0);
    expect(store.size).toBe(0);
    expect(ingested).toHaveLength(0);
  });

  it('stores nothing when the delivery names another connection', async () => {
    const response = await deliver(token, imageEvent(), randomUUID());

    expect(response.status).toBe(401);
    expect(providerRequests).toHaveLength(0);
    expect(store.size).toBe(0);
  });

  it('does not create a second asset when the provider replays the same message', async () => {
    expect((await deliver(token, imageEvent())).status).toBe(202);
    expect((await deliver(token, imageEvent())).status).toBe(202);

    expect(store.size).toBe(1);
    expect(ingested).toHaveLength(2);
    expect(ingested[0].mediaAssetId).toBe(ingested[1].mediaAssetId);
  });

  it('never exposes the delivery token or provider key in a failure body', async () => {
    const response = await deliver(token, {
      ...imageEvent(),
      instance: 'another-tenant',
    });

    expect(response.status).toBe(400);
    const body = await response.text();

    expect(body).not.toContain(token);
    expect(body).not.toContain(apiKey);
    expect(store.size).toBe(0);
  });
});
