import { ForbiddenException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';

import {
  HermesConnectionsService,
  type HermesResolvedConnection,
} from 'src/engine/core-modules/hermes-connections/hermes-connections.service';
import { HermesEventService } from '../events/hermes-event.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ KovaaLabCRMConfigService: class {} }),
);
jest.mock(
  'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service',
  () => ({ HermesProspectionAccessService: class {} }),
);
jest.mock('src/engine/metadata-modules/user-role/user-role.service', () => ({
  UserRoleService: class {},
}));
jest.mock('src/engine/twenty-orm/workspace-orm.manager', () => ({
  WorkspaceOrmManager: class {},
}));
jest.mock('src/modules/emailing/services/message-suppression.service', () => ({
  MessageSuppressionService: class {},
}));
jest.mock(
  'src/modules/emailing/utils/build-emailing-role-permission-config.util',
  () => ({
    buildEmailingRolePermissionConfig: (roleId: string) => ({
      intersectionOf: { user: [roleId] },
    }),
  }),
);
const workspaceId = randomUUID();
const connectionId = randomUUID();
const userId = randomUUID();
const userWorkspaceId = randomUUID();
const secret = 'a'.repeat(64);
function fixture() {
  let revision = 1;
  let revoked = false;
  let rotateAtLock = false;
  let revokeAfterWrite = false;
  let staged: string[] = [];
  let committed: string[] = [];
  const snapshot: HermesResolvedConnection = {
    workspaceId,
    connectionId,
    userId,
    userWorkspaceId,
    revision: 1,
    settings: { allowedSources: ['FORMS'], maxRequestsPerMinute: 10 },
    secrets: { secret },
  };
  const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
    if (
      sql.startsWith('SELECT pg_advisory') &&
      String(parameters?.[0]).startsWith('hermes-messaging:') &&
      rotateAtLock
    )
      revision = 2;
    return sql.startsWith('SELECT "revision"')
      ? [{ connectionId, revision, enabled: true }]
      : [];
  });
  const reader = {
    resolveByConnectionId: jest.fn(async () => snapshot),
    assertRevisionViaQuery:
      HermesConnectionsService.prototype.assertRevisionViaQuery,
  };
  const access = {
    assertAllowed: jest.fn(async () => {
      if (revoked) throw new ForbiddenException();
    }),
  };
  const repository = (name: string) => ({
    findOne: async () => null,
    insert: async () => {
      staged.push(name);
      if (revokeAfterWrite) revoked = true;
    },
    createQueryBuilder: () => {
      const builder = {
        withDeleted: () => builder,
        where: () => builder,
        take: () => builder,
        getMany: async () => [],
      };
      return builder;
    },
  });
  const orm = {
    executeInWorkspaceContext: async (work: () => Promise<unknown>) => work(),
    runInWorkspaceTransaction: async (
      work: (transaction: unknown) => Promise<unknown>,
    ) => {
      staged = [];
      try {
        const result = await work({
          executeRawQuery: query,
          getRepository: repository,
        });
        committed = [...staged];
        return result;
      } catch (error) {
        committed = [];
        throw error;
      }
    },
  };
  const service = new HermesEventService(
    {
      get: () => {
        throw new Error('MUST_NOT_USE_ENV');
      },
    } as never,
    { claim: async () => 'claimed' } as never,
    access as never,
    { getRoleIdForUserWorkspace: async () => randomUUID() } as never,
    orm as never,
    { findApplicableSuppressions: async () => [] } as never,
    {
      findOneBy: async () => ({
        id: workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as never,
    reader as never,
  );
  const body = Buffer.from(
    JSON.stringify({
      version: 'hermes-bridge-v1',
      eventId: 'event',
      occurredAt: new Date().toISOString(),
      provider: 'HEYFORM',
      contact: {
        email: 'person@example.test',
        firstName: 'Synthetic',
        lastName: '',
      },
      event: {
        type: 'SUBMISSION_RECEIVED',
        formId: 'form',
        formName: 'Form',
        summary: 'Synthetic only',
      },
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
    query,
    staged: () => staged,
    committed: () => committed,
    rotateAtLock: () => {
      rotateAtLock = true;
    },
    revokeAfterWrite: () => {
      revokeAfterWrite = true;
    },
  };
}
// Native service and query-helper behavior over an isolated rollback fixture, not PostgreSQL proof.
describe('central event transaction liveness', () => {
  it('rejects a stale revision after the workspace lock before creating contacts or notes', async () => {
    const f = fixture();
    f.rotateAtLock();
    await expect(
      f.service.receive('forms', connectionId, f.body, f.headers),
    ).rejects.toThrow('CONNECTION_REVISION_CONFLICT');
    expect(f.staged()).toEqual([]);
    expect(f.committed()).toEqual([]);
  });
  it('rechecks native authority after writes and rolls back staged contacts and notes', async () => {
    const f = fixture();
    f.revokeAfterWrite();
    await expect(
      f.service.receive('forms', connectionId, f.body, f.headers),
    ).rejects.toThrow(ForbiddenException);
    expect(f.staged().length).toBeGreaterThan(0);
    expect(f.committed()).toEqual([]);
  });
});
