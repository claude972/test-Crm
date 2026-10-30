import { createServer, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { EvolutionMessagesAdapter } from '../evolution-messages.adapter';
import { evolutionProviderConnectionId } from '../evolution-message.types';

const workspaceId = randomUUID();
const remoteJid = '33612345678@s.whatsapp.net';
const image = Buffer.from(
  'synthetic provider bytes, native sniff tested separately',
);
let server: Server;
let requests: {
  method: string;
  path: string;
  key?: string;
  body?: Record<string, unknown>;
}[];
let version = '2.3.6',
  acknowledgement = 201,
  baseUrl = '',
  apiKey = '';
let responseKind: 'image/png' | 'text/html' = 'image/png';
const connection = () => ({ baseUrl, instanceName: 'fixture-media', apiKey });
const adapter = () =>
  new EvolutionMessagesAdapter(
    JSON.stringify({ [workspaceId]: connection() }),
    { allowedInternalHosts: ['127.0.0.1'], timeoutMs: 500 },
  );
const input = () => ({
  workspaceId,
  conversationId: randomUUID(),
  providerConnectionId: evolutionProviderConnectionId(connection()),
  contactHandle: remoteJid,
  text: 'Caption',
  clientRequestId: randomUUID(),
  media: {
    kind: 'IMAGE' as const,
    mimeType: 'image/png',
    filename: 'fixture.png',
    bytes: image,
  },
});

beforeEach(async () => {
  requests = [];
  version = '2.3.6';
  acknowledgement = 201;
  responseKind = 'image/png';
  apiKey = randomBytes(32).toString('hex');
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = chunks.length
      ? JSON.parse(Buffer.concat(chunks).toString())
      : undefined;
    requests.push({
      method: req.method ?? '',
      path: req.url ?? '',
      key: req.headers.apikey as string,
      body,
    });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/') return res.end(JSON.stringify({ version }));
    if (req.url === '/instance/connectionState/fixture-media')
      return res.end(
        JSON.stringify({
          instance: { instanceName: 'fixture-media', state: 'open' },
        }),
      );
    if (req.url === '/chat/getBase64FromMediaMessage/fixture-media')
      return res.end(
        JSON.stringify({
          mimetype: responseKind,
          base64: image.toString('base64'),
        }),
      );
    if (req.url?.startsWith('/message/')) {
      res.statusCode = acknowledgement;
      return res.end(
        JSON.stringify({
          key: { id: 'provider-fixture-id', remoteJid, fromMe: true },
        }),
      );
    }
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw Error('Fixture address missing');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Evolution 2.3.6 media wire contract on disposable HTTP provider', () => {
  it('uses sendMedia with server-owned bytes, MIME and caption, exposing only acceptance metadata', async () => {
    const result = await adapter().send(input());
    expect(result).toEqual({
      providerMessageId: 'provider-fixture-id',
      acceptedAt: expect.any(String),
    });
    expect(requests.filter((request) => request.method === 'POST')).toEqual([
      {
        method: 'POST',
        path: '/message/sendMedia/fixture-media',
        key: apiKey,
        body: {
          number: '33612345678',
          mediatype: 'image',
          mimetype: 'image/png',
          caption: 'Caption',
          fileName: 'fixture.png',
          media: image.toString('base64'),
        },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain(apiKey);
    expect(JSON.stringify(result)).not.toContain(image.toString('base64'));
  });
  it('uses the actual voice route and documented audio field', async () => {
    const data = input();
    data.text = '';
    data.media = {
      ...data.media,
      kind: 'AUDIO' as never,
      mimeType: 'audio/ogg',
      filename: 'voice.ogg',
    };
    await adapter().send(data);
    expect(requests.at(-1)).toMatchObject({
      path: '/message/sendWhatsAppAudio/fixture-media',
      body: { number: '33612345678', audio: image.toString('base64') },
    });
    expect(requests.at(-1)?.body).not.toHaveProperty('media');
  });
  it('fails closed on an unverified media version and never emits a POST', async () => {
    version = '2.4.0';
    await expect(adapter().send(input())).rejects.toMatchObject({
      code: 'MEDIA_PROVIDER_NOT_VERIFIED',
    });
    expect(requests.some((request) => request.method === 'POST')).toBe(false);
  });
  it('never retries a media POST that may have sent despite HTTP400', async () => {
    acknowledgement = 400;
    await expect(adapter().send(input())).rejects.toMatchObject({
      code: 'DELIVERY_UNCERTAIN',
    });
    expect(
      requests.filter((request) => request.method === 'POST'),
    ).toHaveLength(1);
  });
  it('retrieves stored media by key, with no webhook URL, media key or conversion instructions', async () => {
    const result = await adapter().receiveMedia({
      workspaceId,
      providerConnectionId: evolutionProviderConnectionId(connection()),
      providerMessageId: 'fixture-id',
      remoteJid,
      fromMe: false,
      kind: 'IMAGE',
    });
    expect(result).toEqual({ bytes: image, mimeType: 'image/png' });
    expect(requests.at(-1)?.body).toEqual({
      message: { key: { id: 'fixture-id', remoteJid, fromMe: false } },
      convertToMp4: false,
    });
  });
  it('rejects executable or mismatched incoming provider media without exposing base64', async () => {
    responseKind = 'text/html';
    await expect(
      adapter().receiveMedia({
        workspaceId,
        providerConnectionId: evolutionProviderConnectionId(connection()),
        providerMessageId: 'fixture-id',
        remoteJid,
        fromMe: false,
        kind: 'IMAGE',
      }),
    ).rejects.toMatchObject({
      code: 'MEDIA_CONTENT_UNSUPPORTED',
      message: 'MEDIA_CONTENT_UNSUPPORTED',
    });
  });
  it('rejects cross-workspace/connection IDs before contacting a provider', async () => {
    await expect(
      adapter().receiveMedia({
        workspaceId,
        providerConnectionId: 'evolution:foreign',
        providerMessageId: 'fixture-id',
        remoteJid,
        fromMe: false,
        kind: 'IMAGE',
      }),
    ).rejects.toMatchObject({ code: 'CONNECTION_MISMATCH' });
    expect(requests).toHaveLength(0);
  });
});
