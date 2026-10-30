import { ForbiddenException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import { HermesIntakeStateService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-state.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);

const A = randomUUID();
const B = randomUUID();
const connectionA = randomUUID();
const connectionB = randomUUID();
const actor = {
  workspaceId: A,
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const configEntry = (workspaceId: string) => ({
  workspaceId,
  operatorUserId: randomUUID(),
  operatorUserWorkspaceId: randomUUID(),
  secret: randomBytes(32).toString('hex'),
});

describe('Hermes intake status privacy and capability boundary', () => {
  let config: { get: jest.Mock };
  let access: { assertAllowed: jest.Mock };
  let prospection: { list: jest.Mock };
  let state: HermesIntakeStateService;
  beforeEach(() => {
    config = {
      get: jest.fn(() =>
        JSON.stringify({
          [connectionA]: configEntry(A),
          [connectionB]: configEntry(B),
        }),
      ),
    };
    access = { assertAllowed: jest.fn(async () => undefined) };
    prospection = { list: jest.fn(async () => ({ batches: [] })) };
    state = new HermesIntakeStateService(
      access as never,
      config as never,
      prospection as never,
    );
  });
  it('refuses revoked access before config or history reads', async () => {
    access.assertAllowed.mockRejectedValue(new ForbiddenException());
    await expect(state.read(actor, 'A')).rejects.toThrow(ForbiddenException);
    expect(config.get).not.toHaveBeenCalled();
    expect(prospection.list).not.toHaveBeenCalled();
  });
  it('exposes only current workspace sources and relative paths; never secrets or operator IDs', async () => {
    const serialized = JSON.stringify({
      [connectionA]: { ...configEntry(A), allowedSources: ['FORMS'] },
      [connectionB]: configEntry(B),
    });
    config.get.mockReturnValue(serialized);
    const result = await state.read(actor, 'A');
    expect(result.status).toBe('CONFIGURED_UNVERIFIED');
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]).toMatchObject({
      connectionId: connectionA,
      structureId: A,
      isAccepting: null,
      lastCollectionAt: null,
      sources: [
        {
          source: 'FORMS',
          relativeEndpoint: `/webhooks/hermes/forms/${connectionA}`,
          humanQualificationRequired: false,
          nativeContactCreationEnabled: true,
        },
      ],
    });
    const output = JSON.stringify(result);
    expect(output).not.toContain(connectionB);
    expect(output).not.toContain(B);
    for (const entry of Object.values(JSON.parse(serialized)) as ReturnType<
      typeof configEntry
    >[]) {
      expect(output).not.toContain(entry.secret);
      expect(output).not.toContain(entry.operatorUserId);
      expect(output).not.toContain(entry.operatorUserWorkspaceId);
    }
  });
  it('does not infer health or automatic provenance from a manually chosen batch prefix', async () => {
    prospection.list.mockResolvedValue({
      batches: [
        {
          externalBatchId: `${connectionA}:manual-spoof`,
          createdAt: '2026-10-30T12:00:00.000Z',
        },
      ],
    });
    const result = await state.read(actor, 'A');
    expect(result.endpoints[0].isAccepting).toBeNull();
    expect(result.endpoints[0].lastCollectionAt).toBeNull();
  });
  it('reads receipt time exclusively from the matching durable server marker', async () => {
    prospection.list.mockResolvedValue({
      batches: [
        {
          externalBatchId: 'unrelated-prefix',
          createdAt: '2026-10-30T12:00:00.000Z',
          origin: {
            kind: 'SIGNED_INTAKE',
            connectionId: connectionA,
            receivedAt: '2026-10-30T12:00:00.000Z',
          },
        },
        {
          externalBatchId: `${connectionA}:spoof`,
          createdAt: '2026-10-30T13:00:00.000Z',
          origin: { kind: 'MANUAL' },
        },
        {
          origin: {
            kind: 'SIGNED_INTAKE',
            connectionId: connectionB,
            receivedAt: '2026-10-30T14:00:00.000Z',
          },
        },
      ],
    });
    expect((await state.read(actor, 'A')).endpoints[0].lastCollectionAt).toBe(
      '2026-10-30T12:00:00.000Z',
    );
  });

  it('distinguishes absent workspace configuration, disabled mapping and invalid private configuration', async () => {
    config.get.mockReturnValue('{}');
    expect(await state.read(actor, 'A')).toMatchObject({
      status: 'NOT_CONFIGURED',
      endpoints: [],
    });
    expect(prospection.list).not.toHaveBeenCalled();
    config.get.mockReturnValue(
      JSON.stringify({ [connectionA]: { ...configEntry(A), enabled: false } }),
    );
    expect((await state.read(actor, 'A')).endpoints[0]).toMatchObject({
      providerState: 'DISABLED',
      isAccepting: false,
    });
    config.get.mockReturnValue('secret malformed config');
    const invalid = await state.read(actor, 'A');
    expect(invalid).toMatchObject({
      status: 'CONFIGURATION_ERROR',
      endpoints: [],
      errorCode: 'HERMES_INTAKE_CONFIGURATION_UNAVAILABLE',
    });
    expect(JSON.stringify(invalid)).not.toContain('secret malformed config');
  });
});
