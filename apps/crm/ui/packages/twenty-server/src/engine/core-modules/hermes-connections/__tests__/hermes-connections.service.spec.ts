import { ForbiddenException } from '@nestjs/common';
import { type DataSource, type EntityManager } from 'typeorm';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type EnvironmentConfigDriver } from 'src/engine/core-modules/twenty-config/drivers/environment-config.driver';
import { type HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { resolveAndValidateHostname } from 'src/engine/core-modules/secure-http-client/utils/resolve-and-validate-hostname.util';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

import { HermesConnectionEntity } from '../hermes-connection.entity';
import { HermesConnectionsService } from '../hermes-connections.service';

jest.mock(
  'src/engine/core-modules/secure-http-client/utils/resolve-and-validate-hostname.util',
  () => ({ resolveAndValidateHostname: jest.fn(async () => '93.184.216.34') }),
);
const workspaceId = 'b9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const userId = 'a9c2e7ad-67ed-42be-b687-1a410e60b5ba';
const userWorkspaceId = 'e4d16125-1299-4b15-aa57-d193a423b4e7';
const actor = { workspaceId, userId, userWorkspaceId };
const evolution = {
  kind: 'EVOLUTION',
  expectedRevision: 0,
  settings: {
    baseUrl: 'https://evolution.example.com',
    instanceName: 'instance',
  },
  secrets: { apiKey: 'test-key', webhookSecret: 'a'.repeat(64) },
};

function fixture() {
  const rows: HermesConnectionEntity[] = [];
  const repository = {
    findBy: jest.fn(async (scope: Partial<HermesConnectionEntity>) =>
      rows.filter((row) =>
        Object.entries(scope).every(
          ([key, value]) => row[key as keyof HermesConnectionEntity] === value,
        ),
      ),
    ),
    findOneBy: jest.fn(
      async (scope: Partial<HermesConnectionEntity>) =>
        rows.find((row) =>
          Object.entries(scope).every(
            ([key, value]) =>
              row[key as keyof HermesConnectionEntity] === value,
          ),
        ) ?? null,
    ),
    create: jest.fn((row: HermesConnectionEntity) => row),
    save: jest.fn(async (row: HermesConnectionEntity) => {
      const index = rows.findIndex(
        (item) =>
          item.workspaceId === row.workspaceId && item.kind === row.kind,
      );
      if (index === -1) rows.push(row);
      else rows[index] = row;
      return row;
    }),
  };
  const account = {
    id: 'e4d16125-1299-4b15-aa57-d193a423b4e6',
    workspaceId,
    userWorkspaceId,
    handle: 'hello@example.com',
    provider: ConnectedAccountProvider.IMAP_SMTP_CALDAV,
    authFailedAt: null,
    connectionParameters: {
      IMAP: { connectionSecurity: 'SSL_TLS' },
      SMTP: { connectionSecurity: 'STARTTLS' },
    },
  };
  const accounts = { findOne: jest.fn(async () => account) };
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === ConnectedAccountEntity ? accounts : repository,
    ),
    query: jest.fn(async () => undefined),
  };
  const source = {
    manager,
    getRepository: manager.getRepository,
    transaction: jest.fn(
      async (action: (manager: EntityManager) => Promise<unknown>) =>
        action(manager as unknown as EntityManager),
    ),
  };
  const access = {
    assertAllowed: jest.fn(
      async (_actor?: unknown, _manager?: unknown) => undefined,
    ),
  };
  const encryption = new SecretEncryptionService({
    get: (key: string) =>
      key === 'APP_SECRET'
        ? 'unit-only-encryption-key-not-a-live-secret'
        : undefined,
  } as unknown as EnvironmentConfigDriver);
  const service = new HermesConnectionsService(
    source as unknown as DataSource,
    access as unknown as HermesProspectionAccessService,
    encryption,
  );
  return {
    service,
    rows,
    repository,
    manager,
    access,
    encryption,
    account,
    accounts,
  };
}

describe('encrypted workspace connections', () => {
  beforeEach(() =>
    jest.mocked(resolveAndValidateHostname).mockResolvedValue('93.184.216.34'),
  );

  it('stores native enc:v2 with workspace AAD and never returns secrets', async () => {
    const f = fixture();
    const saved = await f.service.save(actor, evolution);
    expect(f.rows[0].configuration).toMatch(/^enc:v2:/);
    expect(f.rows[0].configuration).not.toContain('test-key');
    expect(JSON.stringify(saved)).not.toContain('test-key');
    expect(saved).toMatchObject({
      state: 'CONFIGURED_UNVERIFIED',
      revision: 1,
      secretFields: ['apiKey', 'webhookSecret'],
    });
    expect(await f.service.resolve(workspaceId, 'EVOLUTION')).toMatchObject({
      secrets: evolution.secrets,
    });
    expect(
      await f.service.list({
        ...actor,
        workspaceId: '00000000-0000-4000-8000-000000000001',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'EVOLUTION', state: 'NOT_CONFIGURED' }),
      ]),
    );
  });

  it('rejects stale CAS without changing credentials', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    await expect(f.service.save(actor, evolution)).rejects.toThrow(
      'CONNECTION_REVISION_CONFLICT',
    );
    expect(f.repository.save).toHaveBeenCalledTimes(1);
  });

  it('retains stable identity for rotation but changes ID for a different endpoint', async () => {
    const f = fixture();
    const first = await f.service.save(actor, evolution);
    const rotated = await f.service.save(actor, {
      ...evolution,
      expectedRevision: 1,
      secrets: { ...evolution.secrets, apiKey: 'rotated-key' },
    });
    expect(rotated.connectionId).toBe(first.connectionId);
    const changed = await f.service.save(actor, {
      ...evolution,
      expectedRevision: 2,
      settings: { ...evolution.settings, instanceName: 'other' },
    });
    expect(changed.connectionId).not.toBe(first.connectionId);
  });

  it('refuses to carry credentials to a changed identity', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    await expect(
      f.service.save(actor, {
        ...evolution,
        expectedRevision: 1,
        secrets: undefined,
        settings: { ...evolution.settings, instanceName: 'other' },
      }),
    ).rejects.toThrow('CONNECTION_NEW_IDENTITY_REQUIRES_SECRETS');
  });

  it('keeps monotone tombstone on deletion and never revives the old connection ID', async () => {
    const f = fixture();
    const first = await f.service.save(actor, evolution);
    const removed = await f.service.remove(actor, {
      kind: 'EVOLUTION',
      expectedRevision: 1,
    });
    expect(removed).toMatchObject({
      revision: 2,
      state: 'NOT_CONFIGURED',
      settings: {},
      secretFields: [],
    });
    expect(f.rows[0].configuration).toBeNull();
    expect(await f.service.resolve(workspaceId, 'EVOLUTION')).toBeNull();
    const next = await f.service.save(actor, {
      ...evolution,
      expectedRevision: 2,
    });
    expect(next.connectionId).not.toBe(first.connectionId);
    expect(next.revision).toBe(3);
  });

  it('rechecks authorization after waiting for the transaction lock', async () => {
    const f = fixture();
    f.access.assertAllowed.mockImplementation(
      async (_actor?: unknown, manager?: unknown) => {
        if (manager) throw new ForbiddenException();
      },
    );
    await expect(f.service.save(actor, evolution)).rejects.toThrow(
      ForbiddenException,
    );
    expect(f.repository.save).not.toHaveBeenCalled();
  });

  it('refuses anonymous actor/workspace inputs and secrets embedded in settings', async () => {
    const f = fixture();
    await expect(
      f.service.save(actor, { ...evolution, workspaceId: 'other' }),
    ).rejects.toThrow('CONNECTION_INPUT_INVALID');
    await expect(
      f.service.save(actor, {
        ...evolution,
        settings: { ...evolution.settings, unexpected: 'secret' },
      }),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_INVALID');
  });

  it('blocks insecure or private outbound hosts before persistence', async () => {
    const f = fixture();
    await expect(
      f.service.save(actor, {
        ...evolution,
        settings: { ...evolution.settings, baseUrl: 'http://127.0.0.1:9000' },
      }),
    ).rejects.toThrow('CONNECTION_REQUIRES_HTTPS');
    jest
      .mocked(resolveAndValidateHostname)
      .mockRejectedValueOnce(new Error('private'));
    await expect(f.service.save(actor, evolution)).rejects.toThrow(
      'CONNECTION_ENDPOINT_NOT_PUBLIC',
    );
    expect(f.repository.save).not.toHaveBeenCalled();
  });

  it('detects ciphertext copied between workspaces and between providers', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    f.rows[0].workspaceId = '00000000-0000-4000-8000-000000000001';
    await expect(
      f.service.resolve(f.rows[0].workspaceId, 'EVOLUTION'),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_UNAVAILABLE');
    f.rows[0].workspaceId = workspaceId;
    f.rows[0].kind = 'MCP';
    await expect(f.service.resolve(workspaceId, 'MCP')).rejects.toThrow(
      'CONNECTION_CONFIGURATION_UNAVAILABLE',
    );
  });

  it('denies use after revoking the operator or changing configuration in flight', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    f.access.assertAllowed.mockRejectedValueOnce(new ForbiddenException());
    await expect(f.service.resolve(workspaceId, 'EVOLUTION')).rejects.toThrow(
      ForbiddenException,
    );
    f.access.assertAllowed.mockImplementationOnce(async () => {
      f.rows[0] = { ...f.rows[0], revision: 2 };
    });
    await expect(f.service.resolve(workspaceId, 'EVOLUTION')).rejects.toThrow(
      'CONNECTION_REVISION_CONFLICT',
    );
  });

  it('binds existing encrypted mail accounts and detects changed mailbox identity', async () => {
    const f = fixture();
    const settings = { connectedAccountId: f.account.id, mailbox: 'INBOX' };
    const saved = await f.service.save(actor, {
      kind: 'MAIL',
      expectedRevision: 0,
      settings,
    });
    expect(saved.settings).toMatchObject({ handle: 'hello@example.com' });
    expect(await f.service.resolve(workspaceId, 'MAIL')).toMatchObject({
      settings,
      secrets: {},
      userWorkspaceId,
    });
    f.account.handle = 'different@example.com';
    await expect(f.service.resolve(workspaceId, 'MAIL')).rejects.toThrow(
      'MAIL_IDENTITY_CHANGED',
    );
  });

  it('does not bind a missing account, unsafe transport or client-supplied mailbox password', async () => {
    const f = fixture();
    f.account.connectionParameters.SMTP.connectionSecurity = 'NONE';
    await expect(
      f.service.save(actor, {
        kind: 'MAIL',
        expectedRevision: 0,
        settings: { connectedAccountId: f.account.id, mailbox: 'INBOX' },
      }),
    ).rejects.toThrow('MAIL_ACCOUNT_UNAVAILABLE');
    await expect(
      f.service.save(actor, {
        kind: 'MAIL',
        expectedRevision: 0,
        settings: { connectedAccountId: f.account.id, mailbox: 'INBOX' },
        secrets: { password: 'no' },
      }),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_INVALID');
  });

  it('rejects provider identities or secrets already bound to another workspace', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const other = {
      ...actor,
      workspaceId: '00000000-0000-4000-8000-000000000001',
    };
    await expect(f.service.save(other, evolution)).rejects.toThrow(
      'CONNECTION_IDENTITY_ALREADY_BOUND',
    );
    const input = {
      kind: 'INTAKE',
      expectedRevision: 0,
      settings: { allowedSources: ['SCRAPING'], maxRequestsPerMinute: 10 },
      secrets: { secret: 'c'.repeat(64) },
    };
    await f.service.save(actor, input);
    await expect(f.service.save(other, input)).rejects.toThrow(
      'CONNECTION_IDENTITY_ALREADY_BOUND',
    );
    const mcp = {
      kind: 'MCP',
      expectedRevision: 0,
      settings: {
        endpoint: 'https://mcp.example.com/tools',
        toolName: 'draft',
        protocolVersion: '2025-11-25',
        argumentMap: { text: 'text' },
      },
      secrets: { token: 't'.repeat(32) },
    };
    await f.service.save(actor, mcp);
    await expect(f.service.save(other, mcp)).rejects.toThrow(
      'CONNECTION_IDENTITY_ALREADY_BOUND',
    );
  });

  it('exposes polling scopes and resolves webhook IDs through the same live grant', async () => {
    const f = fixture();
    const saved = await f.service.save(actor, evolution);
    expect(await f.service.workspaceIds('EVOLUTION')).toEqual([workspaceId]);
    expect(
      await f.service.resolveByConnectionId(saved.connectionId!, 'EVOLUTION'),
    ).toMatchObject({ revision: 1 });
    expect(
      await f.service.resolveByConnectionId(saved.connectionId!, 'MCP'),
    ).toBeNull();
    expect(
      await f.service.resolveByConnectionId('not-a-uuid', 'EVOLUTION'),
    ).toBeNull();
    await f.service.remove(actor, { kind: 'EVOLUTION', expectedRevision: 1 });
    expect(
      await f.service.resolveByConnectionId(saved.connectionId!, 'EVOLUTION'),
    ).toBeNull();
    expect(await f.service.workspaceIds('EVOLUTION')).toEqual([]);
  });

  it('keeps native webhook 64hex, distinct key and cross-tenant token requirements', async () => {
    const f = fixture();
    await expect(
      f.service.save(actor, {
        ...evolution,
        secrets: { ...evolution.secrets, webhookSecret: 'w'.repeat(32) },
      }),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_INVALID');
    await expect(
      f.service.save(actor, {
        ...evolution,
        secrets: { apiKey: 'a'.repeat(64), webhookSecret: 'a'.repeat(64) },
      }),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_INVALID');
    await f.service.save(actor, evolution);
    await expect(
      f.service.save(
        { ...actor, workspaceId: '00000000-0000-4000-8000-000000000001' },
        {
          ...evolution,
          settings: { ...evolution.settings, instanceName: 'other' },
        },
      ),
    ).rejects.toThrow('CONNECTION_IDENTITY_ALREADY_BOUND');
  });

  it('validates bounded intake secrets and never assumes configured implies verified', async () => {
    const f = fixture();
    const input = {
      kind: 'INTAKE',
      expectedRevision: 0,
      settings: { allowedSources: ['SCRAPING'], maxRequestsPerMinute: 10 },
      secrets: { secret: 'b'.repeat(64) },
    };
    const saved = await f.service.save(actor, input);
    expect(saved.state).toBe('CONFIGURED_UNVERIFIED');
    expect(JSON.stringify(await f.service.list(actor))).not.toContain(
      'b'.repeat(64),
    );
    await expect(
      f.service.save(actor, {
        ...input,
        expectedRevision: 1,
        secrets: { secret: 'short' },
      }),
    ).rejects.toThrow('CONNECTION_CONFIGURATION_INVALID');
  });
});
