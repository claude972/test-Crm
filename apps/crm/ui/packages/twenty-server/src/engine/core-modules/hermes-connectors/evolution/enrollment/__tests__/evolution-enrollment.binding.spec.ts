import axios from 'axios';
import { type HermesResolvedConnection } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesConnectedEvolutionAdapter } from '../../hermes-connected-evolution.adapter';
import { HermesConnectedEvolutionReceiver } from '../../hermes-connected-evolution.receiver';
import { managedInstanceName } from '../evolution-enrollment.policy';
jest.mock('axios');
jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-messaging/hermes-messaging.service',
  () => ({ HermesMessagingService: class {} }),
);
jest.mock('src/engine/core-modules/hermes-media/hermes-media.service', () => ({
  HermesMediaService: class {},
}));
const workspaceId = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
function fixture() {
  const connection: HermesResolvedConnection = {
    workspaceId,
    connectionId: '00000000-0000-4000-8000-000000000001',
    revision: 1,
    userId: '00000000-0000-4000-8000-000000000003',
    userWorkspaceId: '00000000-0000-4000-8000-000000000004',
    settings: {
      baseUrl: 'https://private-managed.test:8443',
      instanceName: managedInstanceName(workspaceId),
    },
    secrets: { apiKey: 'instance-key', webhookSecret: 'a'.repeat(64) },
    managedEvolution: {
      version: 1,
      operationId: workspaceId,
      phase: 'AWAITING_PAIRING',
    },
  };
  const reader = {
    resolve: jest.fn(async () => connection),
    resolveByConnectionId: jest.fn(async () => connection),
  };
  const config = {
    get: (key: string) =>
      (
        ({
          HERMES_EVOLUTION_PROVISIONER_ENABLED: true,
          HERMES_EVOLUTION_PROVISIONER_BASE_URL:
            'https://private-managed.test:8443',
          HERMES_EVOLUTION_PROVISIONER_API_KEY: 'g'.repeat(64),
          SERVER_URL: 'https://crm.test',
        }) as Record<string, unknown>
      )[key],
  };
  const adapter = new HermesConnectedEvolutionAdapter(
    reader as never,
    config as never,
  );
  return { connection, reader, adapter };
}
beforeEach(() => jest.clearAllMocks());
describe('managed-only private transport and ingress binding', () => {
  it('grants exactly the managed configured hostname, while manual connections retain an empty allowance', async () => {
    const f = fixture();
    expect(
      (await f.adapter.snapshot(workspaceId)).allowedInternalHosts,
    ).toEqual(['private-managed.test']);
    delete f.connection.managedEvolution;
    expect(
      (await f.adapter.snapshot(workspaceId)).allowedInternalHosts,
    ).toEqual([]);
  });
  it.each(['baseUrl', 'instanceName'])(
    'refuses a managed %s substitution before network I/O',
    async (field) => {
      const f = fixture();
      f.connection.settings[field] =
        field === 'baseUrl'
          ? 'https://arbitrary-private.test'
          : 'another-workspace';
      await expect(f.adapter.snapshot(workspaceId)).rejects.toThrow(
        'NOT_CONFIGURED',
      );
      expect(axios.get).not.toHaveBeenCalled();
      expect(axios.post).not.toHaveBeenCalled();
    },
  );
  it('does not permit send or message/media ingress before persisted ACTIVE, even if paired', async () => {
    const f = fixture(),
      inbox = { ingest: jest.fn() },
      media = { receive: jest.fn() };
    const receiver = new HermesConnectedEvolutionReceiver(
      f.reader as never,
      f.adapter,
      media as never,
      inbox as never,
    );
    await expect(
      receiver.receive('a'.repeat(64), {}, f.connection.connectionId),
    ).resolves.toEqual({ status: 'IGNORED', reason: 'ENROLLMENT_INACTIVE' });
    await expect(
      f.adapter.send({
        workspaceId,
        conversationId: workspaceId,
        providerConnectionId: f.connection.connectionId,
        contactHandle: '33612345678@s.whatsapp.net',
        text: 'Synthetic',
        clientRequestId: workspaceId,
      }),
    ).rejects.toThrow('WA_ENROLLMENT_INACTIVE');
    expect(inbox.ingest).not.toHaveBeenCalled();
    expect(media.receive).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
  });
  it('carries persisted cutoff into the authenticated receiver before media/contact/ingest effects', async () => {
    const f = fixture(),
      inbox = { ingest: jest.fn() },
      media = { receive: jest.fn() };
    f.connection.managedEvolution = {
      ...f.connection.managedEvolution!,
      phase: 'ACTIVE',
      cutoffSeconds: Math.floor(Date.now() / 1000),
    };
    const receiver = new HermesConnectedEvolutionReceiver(
      f.reader as never,
      f.adapter,
      media as never,
      inbox as never,
    );
    const body = {
      event: 'messages.upsert',
      instance: f.connection.settings.instanceName,
      data: {
        key: {
          id: 'historic',
          remoteJid: '33612345678@s.whatsapp.net',
          fromMe: false,
        },
        message: { imageMessage: {} },
        messageTimestamp: f.connection.managedEvolution.cutoffSeconds,
      },
    };
    await expect(
      receiver.receive('a'.repeat(64), body, f.connection.connectionId),
    ).resolves.toEqual({ status: 'IGNORED', reason: 'BEFORE_ACTIVATION' });
    expect(inbox.ingest).not.toHaveBeenCalled();
    expect(media.receive).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
