import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { verifyHermesIntakeSignature } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-signature';
import { parseHermesIntakeConnections } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake.schema';
import { HermesIntakeReplayService } from 'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service';

jest.mock('src/engine/core-modules/redis-client/redis-client.service', () => ({
  RedisClientService: class {},
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);

const connectionId = randomUUID();
const secret = randomBytes(32).toString('hex');
const configuration = {
  workspaceId: randomUUID(),
  operatorUserId: randomUUID(),
  operatorUserWorkspaceId: randomUUID(),
  secret,
};

describe('Hermes intake security boundaries', () => {
  it('requires scoped identifiers, distinct high-length keys and no unknown config fields', () => {
    expect(parseHermesIntakeConnections('{}')).toEqual({});
    expect(() =>
      parseHermesIntakeConnections(
        JSON.stringify({
          [connectionId]: { ...configuration, workspaceId: 'global' },
        }),
      ),
    ).toThrow('Hermes intake configuration is invalid');
    expect(() =>
      parseHermesIntakeConnections(
        JSON.stringify({
          [connectionId]: { ...configuration, secret: 'short' },
        }),
      ),
    ).toThrow('Hermes intake configuration is invalid');
    expect(() =>
      parseHermesIntakeConnections(
        JSON.stringify({
          [connectionId]: configuration,
          [randomUUID()]: configuration,
        }),
      ),
    ).toThrow('Hermes intake configuration is invalid');
    expect(() =>
      parseHermesIntakeConnections(
        JSON.stringify({
          [connectionId]: { ...configuration, fallback: true },
        }),
      ),
    ).toThrow('Hermes intake configuration is invalid');
  });

  it('binds every signature to path, timestamp, nonce and exact raw bytes with bounded size', () => {
    const body = Buffer.from('{"rows":[]}');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomUUID();
    const signature = `v1=${createHmac('sha256', Buffer.from(secret, 'hex')).update(`v1\n${connectionId}\n${timestamp}\n${nonce}\n`).update(body).digest('hex')}`;
    const request = {
      connectionId,
      body,
      timestamp,
      nonce,
      signature,
      secret,
      now: Date.now(),
    };
    expect(verifyHermesIntakeSignature(request)).toBe(true);
    for (const patch of [
      { connectionId: randomUUID() },
      { body: Buffer.concat([body, Buffer.from(' ')]) },
      { nonce: randomUUID() },
      { timestamp: String(Number(timestamp) + 1) },
      { signature: 'v1=00' },
      { nonce: 'not-a-uuid' },
      { body: Buffer.alloc(2_000_001) },
    ])
      expect(verifyHermesIntakeSignature({ ...request, ...patch })).toBe(false);
  });

  it.each([
    [1, 'claimed'],
    [0, 'replayed'],
    [-1, 'rate-limited'],
  ])(
    'uses an atomic shared replay/rate primitive for Redis result %s',
    async (result, expected) => {
      const evaluate = jest.fn().mockResolvedValue(result);
      const service = new HermesIntakeReplayService(
        {
          getClient: () => ({ eval: evaluate }),
        } as unknown as ConstructorParameters<
          typeof HermesIntakeReplayService
        >[0],
        { get: () => 'fixture-prefix' } as unknown as ConstructorParameters<
          typeof HermesIntakeReplayService
        >[1],
      );
      await expect(service.claim(connectionId, randomUUID(), 10)).resolves.toBe(
        expected,
      );
      const call = evaluate.mock.calls[0];
      expect(call[0]).toContain("redis.call('SET'");
      expect(call[0]).toContain("'NX'");
      expect(call[1]).toBe(2);
      expect(call[4]).toBe(601_000);
      expect(call[5]).toBe(10);
      expect(call[2]).toContain(
        `fixture-prefix:hermes-intake:${connectionId}:nonce:`,
      );
    },
  );

  it('fails closed when Redis fails instead of falling back to local replay memory', async () => {
    const service = new HermesIntakeReplayService(
      {
        getClient: () => ({
          eval: async () => {
            throw new Error('private transport diagnostics');
          },
        }),
      } as unknown as ConstructorParameters<
        typeof HermesIntakeReplayService
      >[0],
      { get: () => 'fixture-prefix' } as unknown as ConstructorParameters<
        typeof HermesIntakeReplayService
      >[1],
    );
    await expect(service.claim(connectionId, randomUUID(), 10)).rejects.toThrow(
      'HERMES_INTAKE_REPLAY_STORE_UNAVAILABLE',
    );
  });
});
