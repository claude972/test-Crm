import { randomBytes } from 'node:crypto';

import { EvolutionWebhookController } from '../evolution-webhook.controller';
import { EvolutionWebhookReceiver } from '../evolution-webhook.receiver';
import {
  evolutionProviderConnectionId,
  type EvolutionIngestMessage,
  type EvolutionIngestResult,
} from '../evolution-message.types';

const WORKSPACE_A = '4123ec08-5c6a-4ea4-8d55-5aac3c963dc2';
const WORKSPACE_B = '2c29b2f0-ceb5-4933-a542-9e0cc8b1ee61';
const TOKEN_A = randomBytes(32).toString('hex');
const TOKEN_B = randomBytes(32).toString('hex');
const API_KEY = randomBytes(32).toString('hex');
const CONNECTION_A = {
  baseUrl: 'https://provider-a.example.test',
  instanceName: 'tenant-a',
  apiKey: API_KEY,
};
const CONNECTION_B = {
  baseUrl: 'https://provider-b.example.test',
  instanceName: 'tenant-b',
  apiKey: randomBytes(32).toString('hex'),
};
const CONFIG = JSON.stringify({
  [WORKSPACE_A]: CONNECTION_A,
  [WORKSPACE_B]: CONNECTION_B,
});
const TOKENS = JSON.stringify({
  [WORKSPACE_A]: TOKEN_A,
  [WORKSPACE_B]: TOKEN_B,
});
const JID = '33612345678@s.whatsapp.net';
const event = (overrides = {}) => ({
  event: 'messages.upsert',
  instance: 'tenant-a',
  data: {
    key: { id: 'external-1', remoteJid: JID, fromMe: false },
    message: { conversation: 'Synthetic inbound text' },
    messageTimestamp: Math.floor(Date.now() / 1000),
  },
  ...overrides,
});

// The ledger fixture implements the core callback's contract, not production
// persistence. Native durable uniqueness is tested by the messaging core owner.
describe('Evolution webhook authenticated provider bridge', () => {
  let ingested: EvolutionIngestMessage[];
  let ledger: Map<string, EvolutionIngestResult>;
  let ingest: jest.Mock;
  let receiver: EvolutionWebhookReceiver;
  beforeEach(() => {
    ingested = [];
    ledger = new Map();
    ingest = jest.fn(async (message: EvolutionIngestMessage) => {
      ingested.push(message);
      const key = `${message.workspaceId}:${message.providerConnectionId}:${message.providerMessageId}`;
      const existing = ledger.get(key);
      if (existing) return { ...existing, replay: true };
      const result = {
        conversationId: 'conversation-1',
        messageId: `message-${ledger.size + 1}`,
        replay: false,
      };
      ledger.set(key, result);
      return result;
    });
    receiver = new EvolutionWebhookReceiver(CONFIG, TOKENS, ingest);
  });

  it('derives workspace and connection exclusively from private mapping, normalizing real text and time', async () => {
    const payload = event({
      workspaceId: WORKSPACE_B,
      server_url: 'http://169.254.169.254',
      apikey: 'untrusted',
    });
    const response = await receiver.receive(TOKEN_A, payload);
    expect(response).toMatchObject({
      status: 'INGESTED',
      result: { replay: false },
    });
    expect(ingested).toEqual([
      {
        workspaceId: WORKSPACE_A,
        channel: 'WHATSAPP',
        providerConnectionId: evolutionProviderConnectionId(CONNECTION_A),
        providerMessageId: 'external-1',
        providerConversationId: JID,
        contactHandle: JID,
        direction: 'INBOUND',
        text: 'Synthetic inbound text',
        occurredAt: new Date(
          payload.data.messageTimestamp * 1000,
        ).toISOString(),
      },
    ]);
    expect(JSON.stringify(receiver)).not.toContain(TOKEN_A);
    expect(JSON.stringify(ingested)).not.toContain(API_KEY);
  });
  it.each([
    undefined,
    '',
    [],
    TOKEN_A.slice(0, 63),
    randomBytes(32).toString('hex'),
    API_KEY,
  ])(
    'rejects missing/invalid independent header credentials',
    async (token) => {
      await expect(
        receiver.receive(token, event({ apikey: TOKEN_A })),
      ).rejects.toMatchObject({ code: 'WEBHOOK_UNAUTHORIZED' });
      expect(ingest).not.toHaveBeenCalled();
    },
  );
  it('does not allow a valid B token to claim instance A', async () => {
    await expect(receiver.receive(TOKEN_B, event())).rejects.toMatchObject({
      code: 'WEBHOOK_INVALID_EVENT',
    });
    expect(ingest).not.toHaveBeenCalled();
  });
  it('routes the configured second instance to B and never A', async () => {
    await receiver.receive(TOKEN_B, event({ instance: 'tenant-b' }));
    expect(ingested[0].workspaceId).toBe(WORKSPACE_B);
    expect(ingested[0].providerConnectionId).toBe(
      evolutionProviderConnectionId(CONNECTION_B),
    );
  });
  it('keeps identical provider IDs stable for the durable ledger rather than inventing IDs', async () => {
    const payload = event();
    const first = await receiver.receive(TOKEN_A, payload);
    const replay = await receiver.receive(TOKEN_A, payload);
    expect(first).toMatchObject({
      result: { messageId: 'message-1', replay: false },
    });
    expect(replay).toMatchObject({
      result: { messageId: 'message-1', replay: true },
    });
    expect(ledger.size).toBe(1);
    expect(ingested[0]).toEqual(ingested[1]);
  });
  it('normalizes the provider outgoing echo without calling it incoming/delivered', async () => {
    const data = event().data;
    await receiver.receive(
      TOKEN_A,
      event({
        event: 'send.message',
        data: {
          ...data,
          key: { ...data.key, fromMe: true },
          message: { extendedTextMessage: { text: 'Outgoing echo' } },
        },
      }),
    );
    expect(ingested[0]).toMatchObject({
      direction: 'OUTBOUND',
      text: 'Outgoing echo',
    });
    expect(ingested[0]).not.toHaveProperty('delivered');
  });
  it.each(['messages.update', 'connection.update'])(
    'does not fabricate text for event %s',
    async (name) => {
      expect(await receiver.receive(TOKEN_A, event({ event: name }))).toEqual({
        status: 'IGNORED',
        reason: 'UNSUPPORTED_EVENT',
      });
      expect(ingest).not.toHaveBeenCalled();
    },
  );
  it('reports unsupported media explicitly rather than creating a fake conversation', async () => {
    expect(
      await receiver.receive(
        TOKEN_A,
        event({
          data: {
            ...event().data,
            message: { imageMessage: { url: 'https://example.test/media' } },
          },
        }),
      ),
    ).toEqual({ status: 'IGNORED', reason: 'UNSUPPORTED_MESSAGE' });
    expect(ingest).not.toHaveBeenCalled();
  });
  it('preserves a LID thread and uses only the explicit provider phone alternate for the contact', async () => {
    const key = {
      ...event().data.key,
      remoteJid: '987654321@lid',
      remoteJidAlt: JID,
    };
    await receiver.receive(TOKEN_A, event({ data: { ...event().data, key } }));
    expect(ingested[0]).toMatchObject({
      providerConversationId: '987654321@lid',
      contactHandle: JID,
    });
  });
  it('does not turn a group into a personal chat from an alternate participant number', async () => {
    const key = {
      ...event().data.key,
      remoteJid: '12345@g.us',
      remoteJidAlt: JID,
    };
    expect(
      await receiver.receive(
        TOKEN_A,
        event({ data: { ...event().data, key } }),
      ),
    ).toEqual({ status: 'IGNORED', reason: 'UNSUPPORTED_ADDRESS' });
    expect(ingest).not.toHaveBeenCalled();
  });
  it.each(['12345@lid', '12345@g.us', 'status@broadcast'])(
    'does not guess a phone for unsupported address %s',
    async (remoteJid) => {
      expect(
        await receiver.receive(
          TOKEN_A,
          event({
            data: { ...event().data, key: { ...event().data.key, remoteJid } },
          }),
        ),
      ).toEqual({ status: 'IGNORED', reason: 'UNSUPPORTED_ADDRESS' });
      expect(ingest).not.toHaveBeenCalled();
    },
  );
  it.each([0, 'not-time', Number.NaN, Math.floor(Date.now() / 1000) + 1000])(
    'rejects invalid provider timestamp %s',
    async (messageTimestamp) => {
      await expect(
        receiver.receive(
          TOKEN_A,
          event({ data: { ...event().data, messageTimestamp } }),
        ),
      ).rejects.toMatchObject({ code: 'WEBHOOK_INVALID_EVENT' });
      expect(ingest).not.toHaveBeenCalled();
    },
  );
  it('rejects oversized bodies before invoking core', async () => {
    await expect(
      receiver.receive(TOKEN_A, event({ oversized: 'x'.repeat(131_073) })),
    ).rejects.toMatchObject({ code: 'WEBHOOK_INVALID_EVENT' });
    expect(ingest).not.toHaveBeenCalled();
  });
  it.each([
    { [WORKSPACE_A]: 'weak' },
    { [WORKSPACE_A]: API_KEY },
    { [WORKSPACE_A]: TOKEN_A, [WORKSPACE_B]: TOKEN_A },
    { ['e993f292-7557-432b-b312-d630ce35c5a3']: TOKEN_A },
  ])(
    'rejects unsafe webhook configuration without dumping tokens',
    (tokens) => {
      expect(
        () =>
          new EvolutionWebhookReceiver(CONFIG, JSON.stringify(tokens), ingest),
      ).toThrow('WEBHOOK_CONFIGURATION_INVALID');
    },
  );
  it('does not mark ingestion successful if native storage refuses the event', async () => {
    ingest.mockRejectedValue(new Error('Workspace disabled'));
    const controller = new EvolutionWebhookController(receiver);
    await expect(controller.receive(TOKEN_A, event())).rejects.toMatchObject({
      status: 503,
      message: 'Evolution webhook ingestion unavailable',
    });
  });
  it('maps auth and malformed event failures to safe HTTP errors', async () => {
    const controller = new EvolutionWebhookController(receiver);
    await expect(controller.receive(undefined, event())).rejects.toMatchObject({
      status: 401,
    });
    await expect(controller.receive(TOKEN_A, {})).rejects.toMatchObject({
      status: 400,
    });
    expect(Reflect.getMetadata('path', EvolutionWebhookController)).toBe(
      'webhooks/hermes/evolution',
    );
  });
});

describe('Evolution private media ingress', () => {
  it.each(['IMAGE', 'VIDEO', 'AUDIO'] as const)(
    'imports %s after authentication, ignoring webhook URLs and media keys',
    async (kind) => {
      const assetId = 'd969ca4a-05fb-4f6f-a8e6-c1baf31e22f5';
      const ingest = jest.fn(async () => ({
        conversationId: 'fixture-conversation',
        messageId: 'fixture-message',
        replay: false,
      }));
      const media = jest.fn(async () => ({ assetId }));
      const receiver = new EvolutionWebhookReceiver(
        CONFIG,
        TOKENS,
        ingest,
        media,
      );
      const field = {
        IMAGE: 'imageMessage',
        VIDEO: 'videoMessage',
        AUDIO: 'audioMessage',
      }[kind];
      const data = {
        key: { id: 'private-media', remoteJid: JID, fromMe: false },
        message: {
          [field]: {
            caption: kind === 'AUDIO' ? undefined : 'Caption',
            url: 'http://169.254.169.254/latest/meta-data',
            mediaKey: 'untrusted-private-key',
          },
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
      };
      await receiver.receive(TOKEN_A, event({ data }));
      expect(media).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_A,
        conversationId: expect.any(String),
        providerConnectionId: evolutionProviderConnectionId(CONNECTION_A),
        providerMessageId: 'private-media',
        remoteJid: JID,
        fromMe: false,
        kind,
      });
      expect(JSON.stringify(media.mock.calls)).not.toContain('169.254.169.254');
      expect(JSON.stringify(ingest.mock.calls)).not.toContain('mediaKey');
      expect(ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: WORKSPACE_A,
          kind,
          mediaAssetId: assetId,
          text: kind === 'AUDIO' ? '' : 'Caption',
        }),
      );
    },
  );
  it('does not fetch or persist media for a forged webhook token', async () => {
    const media = jest.fn(),
      ingest = jest.fn();
    const receiver = new EvolutionWebhookReceiver(
      CONFIG,
      TOKENS,
      ingest,
      media,
    );
    await expect(
      receiver.receive('0'.repeat(64), event()),
    ).rejects.toMatchObject({ code: 'WEBHOOK_UNAUTHORIZED' });
    expect(media).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
  });
  it('fails ingestion instead of acknowledging missing or unavailable media as received', async () => {
    const media = jest.fn(async () => {
        throw Error('MEDIA_FETCH_FAILED');
      }),
      ingest = jest.fn();
    const receiver = new EvolutionWebhookReceiver(
      CONFIG,
      TOKENS,
      ingest,
      media,
    );
    const data = {
      key: { id: 'private-media', remoteJid: JID, fromMe: false },
      message: { imageMessage: {} },
      messageTimestamp: Math.floor(Date.now() / 1000),
    };
    await expect(receiver.receive(TOKEN_A, event({ data }))).rejects.toThrow(
      'MEDIA_FETCH_FAILED',
    );
    expect(ingest).not.toHaveBeenCalled();
  });
});
