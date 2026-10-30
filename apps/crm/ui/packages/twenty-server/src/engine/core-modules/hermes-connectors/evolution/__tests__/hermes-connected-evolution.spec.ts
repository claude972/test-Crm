import axios from 'axios';

import {
  type HermesConnectionsService,
  type HermesResolvedConnection,
} from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesConnectedEvolutionAdapter } from '../hermes-connected-evolution.adapter';
import { HermesConnectedEvolutionReceiver } from '../hermes-connected-evolution.receiver';

jest.mock('axios');
const workspaceId = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const connectionId = '00000000-0000-4000-8000-000000000001';
const open = {
  status: 200,
  data: { instance: { instanceName: 'instance', state: 'open' } },
};
const input = {
  workspaceId,
  providerConnectionId: connectionId,
  conversationId: '00000000-0000-4000-8000-000000000002',
  contactHandle: '596696123456@s.whatsapp.net',
  text: 'Synthetic only',
  clientRequestId: 'unit-request',
};

function fixture() {
  let current: HermesResolvedConnection | null = {
    workspaceId,
    connectionId,
    revision: 1,
    userId: '00000000-0000-4000-8000-000000000003',
    userWorkspaceId: '00000000-0000-4000-8000-000000000004',
    settings: {
      baseUrl: 'https://evolution.example.com',
      instanceName: 'instance',
    },
    secrets: { apiKey: 'unit-key', webhookSecret: 'a'.repeat(64) },
  };
  const resolve = jest.fn(async () =>
    current
      ? {
          ...current,
          settings: { ...current.settings },
          secrets: { ...current.secrets },
        }
      : null,
  );
  const reader = {
    resolve,
    resolveByConnectionId: jest.fn(async (id: string) =>
      id === current?.connectionId ? resolve() : null,
    ),
  } as unknown as HermesConnectionsService;
  const adapter = new HermesConnectedEvolutionAdapter(reader);
  return {
    adapter,
    reader,
    resolve,
    revoke: () => {
      current = null;
    },
    rotate: () => {
      current = {
        ...current!,
        revision: current!.revision + 1,
        secrets: { ...current!.secrets, apiKey: 'rotated-key' },
      };
    },
  };
}

describe('live central Evolution binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.get).mockResolvedValue(open);
    jest
      .mocked(axios.post)
      .mockResolvedValue({
        status: 201,
        data: {
          key: {
            id: 'provider-id',
            remoteJid: input.contactHandle,
            fromMe: true,
          },
        },
      });
  });
  it('reloads credentials between calls and maps the authoritative connection ID', async () => {
    const f = fixture();
    await f.adapter.send(input);
    f.rotate();
    await f.adapter.send(input);
    expect(jest.mocked(axios.post).mock.calls[0][2]?.headers).toMatchObject({
      apikey: 'unit-key',
    });
    expect(jest.mocked(axios.post).mock.calls[1][2]?.headers).toMatchObject({
      apikey: 'rotated-key',
    });
  });
  it('fails closed after revoke without falling back or contacting a provider', async () => {
    const f = fixture();
    f.revoke();
    expect(await f.adapter.probe(workspaceId)).toMatchObject({
      status: 'NOT_CONFIGURED',
      canSend: false,
    });
    await expect(f.adapter.send(input)).rejects.toThrow('NOT_CONFIGURED');
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });
  it('refuses an old conversation identity before provider I/O', async () => {
    const f = fixture();
    await expect(
      f.adapter.send({ ...input, providerConnectionId: 'old-instance' }),
    ).rejects.toThrow('CONNECTION_MISMATCH');
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('rechecks revision after an in-flight provider probe before sending', async () => {
    const f = fixture();
    jest.mocked(axios.get).mockImplementationOnce(async () => {
      f.rotate();
      return open;
    });
    await expect(f.adapter.send(input)).rejects.toThrow('CONNECTION_MISMATCH');
    expect(axios.post).not.toHaveBeenCalled();
  });
  it('does not return private bytes after configuration is revoked during fetch', async () => {
    const f = fixture();
    jest
      .mocked(axios.get)
      .mockResolvedValue({ status: 200, data: { version: '2.3.6' } });
    jest.mocked(axios.post).mockImplementationOnce(async () => {
      f.revoke();
      return {
        status: 200,
        data: {
          base64: Buffer.from('synthetic-private-bytes').toString('base64'),
          mimetype: 'image/jpeg',
        },
      };
    });
    await expect(
      f.adapter.receiveMedia({
        ...input,
        providerMessageId: 'provider',
        remoteJid: input.contactHandle,
        fromMe: false,
        kind: 'IMAGE',
      }),
    ).rejects.toThrow('CONNECTION_MISMATCH');
  });
  it('uses authenticated connection workspace and ID for ingress, ignoring body tenancy', async () => {
    const f = fixture();
    const inbox = {
      ingest: jest.fn(async () => ({
        conversationId: input.conversationId,
        messageId: 'message',
        replay: false,
      })),
    };
    const receiver = new HermesConnectedEvolutionReceiver(
      f.reader,
      f.adapter,
      {} as never,
      inbox as never,
    );
    await receiver.receive(
      'a'.repeat(64),
      {
        workspaceId: 'foreign-workspace',
        instance: 'instance',
        event: 'messages.upsert',
        data: {
          key: {
            id: 'provider-message',
            remoteJid: input.contactHandle,
            fromMe: false,
          },
          message: { conversation: 'Synthetic inbound' },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      },
      connectionId,
    );
    expect(inbox.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId,
        providerConnectionId: connectionId,
      }),
    );
    await expect(
      receiver.receive('a'.repeat(64), {}, undefined),
    ).rejects.toThrow('WEBHOOK_UNAUTHORIZED');
    await expect(
      receiver.receive('b'.repeat(64), {}, connectionId),
    ).rejects.toThrow('WEBHOOK_UNAUTHORIZED');
    expect(inbox.ingest).toHaveBeenCalledTimes(1);
  });
});
