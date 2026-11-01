import {
  type EvolutionEnrollmentView,
  type ManagedEvolution,
} from '../evolution-enrollment.policy';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { EvolutionEnrollmentService } from '../evolution-enrollment.service';
import {
  EvolutionEnrollmentClient,
  EvolutionEnrollmentError,
} from '../evolution-enrollment.client';
jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
const actor = {
  workspaceId: 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba',
  userId: 'a9c2e7ad-67ed-42be-b687-1a410e60b5ba',
  userWorkspaceId: 'e4d16125-1299-4b15-aa57-d193a423b4e7',
};
function fixture() {
  const snapshot: {
    revision: number;
    botMode: EvolutionEnrollmentView['botMode'];
    connection: {
      connectionId: string;
      settings: { baseUrl: string; instanceName: string };
      secrets: { apiKey: string; webhookSecret: string };
      managedEvolution: ManagedEvolution;
    };
  } = {
    revision: 1,
    botMode: 'OFF',
    connection: {
      connectionId: 'f4d16125-1299-4b15-aa57-d193a423b4e7',
      settings: { baseUrl: 'https://managed.test', instanceName: 'derived' },
      secrets: { apiKey: 'instance-key', webhookSecret: 'a'.repeat(64) },
      managedEvolution: {
        version: 1,
        operationId: actor.workspaceId,
        phase: 'PROVISIONING',
      },
    },
  };
  const connections = {
    managedWhatsappBotMode: jest.fn(async () => snapshot.botMode),
    list: jest.fn(async () => [
      { kind: 'EVOLUTION', revision: snapshot.revision },
    ]),
    reserveManagedEvolution: jest.fn(async () => ({
      created: true,
      revision: snapshot.revision,
    })),
    managedEnrollmentSnapshot: jest.fn(
      async (_actor: HermesMessagingActor, revision: number) => {
        if (revision !== snapshot.revision)
          throw new Error('CONNECTION_REVISION_CONFLICT');
        return structuredClone(snapshot);
      },
    ),
    transitionManagedEvolution: jest.fn(
      async (
        _actor: HermesMessagingActor,
        revision: number,
        phase: ManagedEvolution['phase'],
      ) => {
        if (revision !== snapshot.revision)
          throw new Error('CONNECTION_REVISION_CONFLICT');
        if (
          phase === 'ACTIVATING' &&
          !snapshot.connection.managedEvolution.cutoffSeconds
        )
          snapshot.connection.managedEvolution.cutoffSeconds = 1800000000;
        if (snapshot.connection.managedEvolution.phase !== phase)
          snapshot.revision++;
        snapshot.connection.managedEvolution.phase = phase;
        return snapshot.revision;
      },
    ),
  };
  const values: Record<string, unknown> = {
    HERMES_EVOLUTION_PROVISIONER_ENABLED: true,
    HERMES_EVOLUTION_PROVISIONER_BASE_URL: 'https://managed.test',
    HERMES_EVOLUTION_PROVISIONER_API_KEY: 'g'.repeat(64),
    SERVER_URL: 'https://crm.test',
  };
  const config = { get: jest.fn((key: string) => values[key]) };
  const service = new EvolutionEnrollmentService(
    connections as never,
    config as never,
  );
  return { service, connections, snapshot, values };
}
let create: jest.SpyInstance,
  status: jest.SpyInstance,
  disabled: jest.SpyInstance,
  qr: jest.SpyInstance,
  activate: jest.SpyInstance;
beforeEach(() => {
  create = jest
    .spyOn(EvolutionEnrollmentClient.prototype, 'create')
    .mockResolvedValue(undefined);
  status = jest
    .spyOn(EvolutionEnrollmentClient.prototype, 'status')
    .mockResolvedValue('open');
  disabled = jest
    .spyOn(EvolutionEnrollmentClient.prototype, 'webhookDisabled')
    .mockResolvedValue(undefined);
  qr = jest
    .spyOn(EvolutionEnrollmentClient.prototype, 'qr')
    .mockResolvedValue({ pairingCode: 'ABCD-1234' });
  activate = jest
    .spyOn(EvolutionEnrollmentClient.prototype, 'activate')
    .mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());
describe('native enrollment orchestration', () => {
  it('reserves durably before create and does not POST again on a repeated start', async () => {
    const f = fixture();
    create.mockImplementationOnce(async () => {
      expect(f.connections.reserveManagedEvolution).toHaveBeenCalled();
      expect(f.snapshot.connection.managedEvolution.phase).toBe('PROVISIONING');
    });
    expect(await f.service.start(actor, { expectedRevision: 0 })).toMatchObject(
      {
        revision: 2,
        state: 'AWAITING_PAIRING',
        ingressEnabled: false,
        botMode: 'OFF',
      },
    );
    f.connections.reserveManagedEvolution.mockResolvedValueOnce({
      created: false,
      revision: 2,
    });
    await expect(
      f.service.start(actor, { expectedRevision: 2 }),
    ).resolves.toMatchObject({ state: 'PAIRED_PENDING_ACTIVATION' });
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('retains unconfirmed provisioning after lost response, never claims connected', async () => {
    const f = fixture();
    create.mockRejectedValueOnce(
      new EvolutionEnrollmentError('WA_PROVIDER_UNAVAILABLE'),
    );
    await expect(
      f.service.start(actor, { expectedRevision: 0 }),
    ).resolves.toMatchObject({
      state: 'PROVISIONING_UNCONFIRMED',
      ingressEnabled: false,
      reasonCode: 'WA_PROVISIONING_UNCONFIRMED',
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(disabled).not.toHaveBeenCalled();
  });
  it('polls read-only and reports actual bot changes', async () => {
    const f = fixture();
    f.snapshot.botMode = 'ASSISTED';
    await expect(
      f.service.status(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({
      botMode: 'ASSISTED',
      state: 'PAIRED_PENDING_ACTIVATION',
    });
    expect(f.connections.transitionManagedEvolution).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(qr).not.toHaveBeenCalled();
  });
  it('reports a failed status probe as unavailable rather than paired', async () => {
    const f = fixture();
    status.mockRejectedValueOnce(
      new EvolutionEnrollmentError('WA_PROVIDER_UNAVAILABLE'),
    );
    await expect(
      f.service.status(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({
      state: 'UNAVAILABLE',
      providerState: null,
      reasonCode: 'WA_PROVIDER_UNAVAILABLE',
      ingressEnabled: false,
    });
    expect(f.connections.transitionManagedEvolution).not.toHaveBeenCalled();
  });
  it('persists cutoff before enabling webhook, never renews it on status or repeated activation', async () => {
    const f = fixture();
    activate.mockImplementation(async () => {
      expect(f.snapshot.connection.managedEvolution).toMatchObject({
        phase: 'ACTIVATING',
        cutoffSeconds: 1800000000,
      });
    });
    await expect(
      f.service.activate(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({
      state: 'ACTIVE',
      revision: 3,
      cutoffAt: new Date(1800000000000).toISOString(),
      ingressEnabled: true,
    });
    await f.service.status(actor, { expectedRevision: 3 });
    await f.service.activate(actor, { expectedRevision: 3 });
    expect(activate).toHaveBeenCalledTimes(1);
    expect(f.snapshot.connection.managedEvolution.cutoffSeconds).toBe(
      1800000000,
    );
  });
  it('does not activate while bot is not OFF or provider is not open', async () => {
    const f = fixture();
    f.snapshot.botMode = 'ASSISTED';
    await expect(
      f.service.activate(actor, { expectedRevision: 1 }),
    ).rejects.toThrow('WA_BOT_MUST_BE_OFF');
    expect(status).not.toHaveBeenCalled();
    f.snapshot.botMode = 'OFF';
    status.mockResolvedValueOnce('connecting');
    await expect(
      f.service.activate(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({
      state: 'CONNECTING',
      ingressEnabled: false,
      reasonCode: 'WA_NOT_PAIRED',
    });
    expect(activate).not.toHaveBeenCalled();
    expect(f.connections.transitionManagedEvolution).not.toHaveBeenCalled();
  });
  it('stays locally closed with immutable cutoff after an ambiguous remote webhook update', async () => {
    const f = fixture();
    activate.mockRejectedValueOnce(
      new EvolutionEnrollmentError('WA_INGRESS_UNCONFIRMED'),
    );
    await expect(
      f.service.activate(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({
      state: 'UNAVAILABLE',
      ingressEnabled: false,
      revision: 2,
    });
    expect(f.snapshot.connection.managedEvolution).toMatchObject({
      phase: 'ACTIVATING',
      cutoffSeconds: 1800000000,
    });
    await expect(
      f.service.activate(actor, { expectedRevision: 2 }),
    ).resolves.toMatchObject({ state: 'ACTIVE', revision: 3 });
    expect(f.snapshot.connection.managedEvolution.cutoffSeconds).toBe(
      1800000000,
    );
  });
  it('returns short-lived QR/code only after off-webhook checks, with no durable QR write', async () => {
    const f = fixture();
    status.mockResolvedValueOnce('close');
    const result = await f.service.qr(actor, {
      expectedRevision: 1,
      phoneNumber: '+33612345678',
    });
    expect(result).toMatchObject({
      state: 'CONNECTING',
      pairingCode: 'ABCD-1234',
    });
    expect(Date.parse(result.expiresAt!) - Date.now()).toBeLessThanOrEqual(
      60000,
    );
    expect(disabled).toHaveBeenCalledTimes(1);
    expect(f.connections.transitionManagedEvolution).not.toHaveBeenCalled();
    expect(JSON.stringify(f.snapshot)).not.toContain('ABCD-1234');
  });
  it('discards QR data after a revoked authorization/revision and propagates failure', async () => {
    const f = fixture();
    status.mockResolvedValueOnce('close');
    qr.mockImplementationOnce(async () => {
      f.connections.managedEnrollmentSnapshot.mockRejectedValueOnce(
        new Error('DENIED'),
      );
      return { pairingCode: 'ABCD-1234' };
    });
    await expect(
      f.service.qr(actor, { expectedRevision: 1, phoneNumber: '+33612345678' }),
    ).rejects.toThrow('DENIED');
  });
  it('checks access even when disabled and refuses arbitrary scope/provider parameters', async () => {
    const f = fixture();
    f.values.HERMES_EVOLUTION_PROVISIONER_ENABLED = false;
    f.connections.managedWhatsappBotMode.mockRejectedValueOnce(
      new Error('DENIED'),
    );
    await expect(
      f.service.status(actor, { expectedRevision: 1 }),
    ).rejects.toThrow('DENIED');
    await expect(
      f.service.start(actor, {
        expectedRevision: 1,
        workspaceId: actor.workspaceId,
      }),
    ).rejects.toThrow('WA_ENROLLMENT_INPUT_INVALID');
    await expect(
      f.service.status(actor, { expectedRevision: 1 }),
    ).resolves.toMatchObject({ state: 'NOT_CONFIGURED' });
    expect(create).not.toHaveBeenCalled();
  });
});
