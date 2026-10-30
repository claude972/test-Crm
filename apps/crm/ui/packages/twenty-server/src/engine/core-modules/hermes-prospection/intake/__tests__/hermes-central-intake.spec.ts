import { createHmac, randomUUID } from 'node:crypto';

import { type HermesResolvedConnection } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesIntakeService } from '../hermes-intake.service';
import { type HermesConnectionsService } from 'src/engine/core-modules/hermes-connections/hermes-connections.service';

jest.mock(
  'src/engine/core-modules/hermes-connections/hermes-connections.service',
  () => ({ HermesConnectionsService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection.service',
  () => ({ HermesProspectionService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/intake/hermes-intake-replay.service',
  () => ({ HermesIntakeReplayService: class {} }),
);
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
const workspaceId = randomUUID();
const connectionId = randomUUID();
const userId = randomUUID();
const userWorkspaceId = randomUUID();
const secret = 'a'.repeat(64);
function fixture() {
  let current: HermesResolvedConnection | null = {
    workspaceId,
    connectionId,
    userId,
    userWorkspaceId,
    revision: 1,
    settings: { allowedSources: ['SCRAPING'], maxRequestsPerMinute: 10 },
    secrets: { secret },
  };
  const reader = {
    resolveByConnectionId: jest.fn(async (id: string) =>
      id === connectionId && current ? { ...current } : null,
    ),
  };
  const config = {
    get: jest.fn(() => {
      throw new Error('MUST_NOT_FALL_BACK');
    }),
  };
  const replay = { claim: jest.fn(async () => 'claimed') };
  const prospection = {
    createBatch: jest.fn(async () => ({
      batch: { id: 'batch', externalBatchId: 'batch', rows: [] },
      replay: false,
    })),
  };
  const service = new HermesIntakeService(
    config as never,
    replay as never,
    prospection as never,
    reader as unknown as HermesConnectionsService,
  );
  const body = Buffer.from(
    JSON.stringify({
      externalBatchId: 'batch',
      name: 'Synthetic scrape',
      sourceUrl: 'https://example.test/directory',
      collectedAt: new Date().toISOString(),
      rows: [
        { email: 'person@example.test', companyName: 'Synthetic company' },
      ],
    }),
  );
  const headers = {
    timestamp: String(Math.floor(Date.now() / 1000)),
    nonce: randomUUID(),
    signature: '',
  };
  headers.signature = `v1=${createHmac('sha256', Buffer.from(secret, 'hex')).update(`v1\n${connectionId}\n${headers.timestamp}\n${headers.nonce}\n`).update(body).digest('hex')}`;
  return {
    service,
    body,
    headers,
    reader,
    prospection,
    replay,
    config,
    revoke: () => {
      current = null;
    },
    rotate: () => {
      current = { ...current!, revision: 2 };
    },
  };
}
describe('authoritative central signed intake', () => {
  it('uses server-side workspace/operator and validates the native HMAC before storage', async () => {
    const f = fixture();
    await f.service.receive(connectionId, f.body, f.headers);
    expect(f.prospection.createBatch).toHaveBeenCalledWith(
      { workspaceId, userId, userWorkspaceId },
      expect.anything(),
      { connectionId, assertLive: expect.any(Function) },
    );
    expect(f.config.get).not.toHaveBeenCalled();
  });
  it('rejects revoked and wrong-id bindings without environment fallback or persistence', async () => {
    const f = fixture();
    f.revoke();
    await expect(
      f.service.receive(connectionId, f.body, f.headers),
    ).rejects.toThrow('HERMES_INTAKE_AUTHENTICATION_FAILED');
    expect(f.config.get).not.toHaveBeenCalled();
    expect(f.prospection.createBatch).not.toHaveBeenCalled();
  });
  it('rejects rotation or revoke during replay claim before storage', async () => {
    const f = fixture();
    f.replay.claim.mockImplementationOnce(async () => {
      f.rotate();
      return 'claimed';
    });
    await expect(
      f.service.receive(connectionId, f.body, f.headers),
    ).rejects.toThrow('HERMES_INTAKE_CONNECTION_CHANGED');
    expect(f.prospection.createBatch).not.toHaveBeenCalled();
  });
  it('does not accept changed bytes or a forged signature', async () => {
    const f = fixture();
    await expect(
      f.service.receive(
        connectionId,
        Buffer.concat([f.body, Buffer.from(' ')]),
        f.headers,
      ),
    ).rejects.toThrow('HERMES_INTAKE_AUTHENTICATION_FAILED');
    expect(f.replay.claim).not.toHaveBeenCalled();
    expect(f.prospection.createBatch).not.toHaveBeenCalled();
  });
});
