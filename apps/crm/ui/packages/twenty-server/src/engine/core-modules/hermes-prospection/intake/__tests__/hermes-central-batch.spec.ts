import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { type EntityManager } from 'typeorm';

import { HermesProspectionService } from '../../hermes-prospection.service';
import { emptyHermesProspectionState } from '../../utils/hermes-import-policy';
import { type HermesProspectionState } from '../../types/hermes-prospection.types';

jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-import-state.service',
  () => ({ HermesImportStateService: class {} }),
);
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
const actor = {
  workspaceId: randomUUID(),
  userId: randomUUID(),
  userWorkspaceId: randomUUID(),
};
const input = {
  externalBatchId: 'synthetic-batch',
  name: 'Synthetic scrape',
  sourceUrl: 'https://example.test/directory',
  collectedAt: new Date().toISOString(),
  rows: [{ email: 'person@example.test', companyName: 'Synthetic company' }],
};
function fixture() {
  let committed = emptyHermesProspectionState();
  let live = true;
  const manager = { query: jest.fn(async () => undefined) };
  const states = {
    mutate: async (
      _actor: unknown,
      operation: (
        state: HermesProspectionState,
        manager: EntityManager,
      ) => Promise<unknown>,
    ) => {
      const draft = structuredClone(committed);
      const result = await operation(
        draft,
        manager as unknown as EntityManager,
      );
      committed = draft;
      return result;
    },
  };
  const suppressions = { findApplicableSuppressions: jest.fn(async () => []) };
  const service = new HermesProspectionService(
    states as never,
    suppressions as never,
    {} as never,
    {} as never,
  );
  const assertLive = jest.fn(async (transaction?: EntityManager) => {
    expect(transaction).toBe(manager);
    if (!live) throw new ConflictException('CONNECTION_REVISION_CONFLICT');
  });
  return {
    service,
    manager,
    suppressions,
    assertLive,
    revoke: () => {
      live = false;
    },
    state: () => committed,
  };
}
describe('signed intake batch transaction guard', () => {
  it('rechecks after waiting for the messaging lock before claiming a batch', async () => {
    const f = fixture();
    f.manager.query.mockImplementationOnce(async () => {
      f.revoke();
    });
    await expect(
      f.service.createBatch(actor, input, {
        connectionId: randomUUID(),
        assertLive: f.assertLive,
      }),
    ).rejects.toThrow('CONNECTION_REVISION_CONFLICT');
    expect(f.state().batches).toEqual([]);
    expect(f.suppressions.findApplicableSuppressions).not.toHaveBeenCalled();
  });
  it('rechecks after suppression I/O and leaves no committed batch on late revocation', async () => {
    const f = fixture();
    f.suppressions.findApplicableSuppressions.mockImplementationOnce(
      async () => {
        f.revoke();
        return [];
      },
    );
    await expect(
      f.service.createBatch(actor, input, {
        connectionId: randomUUID(),
        assertLive: f.assertLive,
      }),
    ).rejects.toThrow('CONNECTION_REVISION_CONFLICT');
    expect(f.assertLive).toHaveBeenCalledTimes(2);
    expect(f.state().batches).toEqual([]);
  });
});
