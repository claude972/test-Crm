import { randomBytes } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import {
  EvolutionWebhookController,
  EVOLUTION_WEBHOOK_RECEIVER,
} from '../evolution-webhook.controller';
import { EvolutionWebhookReceiver } from '../evolution-webhook.receiver';

const WORKSPACE = '4123ec08-5c6a-4ea4-8d55-5aac3c963dc2';
const TOKEN = randomBytes(32).toString('hex');

jest.setTimeout(30_000);

describe('Actual Nest webhook HTTP on a synthetic loopback listener, without DB', () => {
  let app: INestApplication;
  let origin: string;
  const ingest = jest.fn(async () => ({
    conversationId: 'fixture-conversation',
    messageId: 'fixture-message',
    replay: false,
  }));
  const payload = () => ({
    event: 'messages.upsert',
    instance: 'fixture',
    data: {
      key: {
        id: 'fixture-external-message',
        remoteJid: '33612345678@s.whatsapp.net',
        fromMe: false,
      },
      message: { conversation: 'Synthetic fixture only' },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  });
  beforeAll(async () => {
    const receiver = new EvolutionWebhookReceiver(
      JSON.stringify({
        [WORKSPACE]: {
          baseUrl: 'https://provider.example.test',
          instanceName: 'fixture',
          apiKey: randomBytes(32).toString('hex'),
        },
      }),
      JSON.stringify({ [WORKSPACE]: TOKEN }),
      ingest,
    );
    const module = await Test.createTestingModule({
      controllers: [EvolutionWebhookController],
      providers: [{ provide: EVOLUTION_WEBHOOK_RECEIVER, useValue: receiver }],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => ingest.mockClear());

  const post = (token: string | undefined, body: unknown) =>
    fetch(`${origin}/webhooks/hermes/evolution`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-hermes-evolution-token': token } : {}),
      },
      body: JSON.stringify(body),
    });
  it('returns401 without dedicated token and does not invoke ingest', async () => {
    const response = await post(undefined, payload());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      message: 'Evolution webhook rejected',
    });
    expect(ingest).not.toHaveBeenCalled();
  });
  it('receives the official event over HTTP, returns202 and derives the tenant', async () => {
    const response = await post(TOKEN, {
      ...payload(),
      workspaceId: 'untrusted-body',
    });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      status: 'INGESTED',
      result: { messageId: 'fixture-message' },
    });
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE,
        direction: 'INBOUND',
        providerMessageId: 'fixture-external-message',
      }),
    );
  });
  it('returns400 for another instance without writing a message', async () => {
    const response = await post(TOKEN, {
      ...payload(),
      instance: 'another-tenant',
    });
    expect(response.status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });
  it('does not expose provider tokens or native storage errors on503', async () => {
    ingest.mockRejectedValueOnce(new Error(`private internal error ${TOKEN}`));
    const response = await post(TOKEN, payload());
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain(TOKEN);
    expect(body).not.toContain('private internal');
  });
});
