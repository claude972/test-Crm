import { ForbiddenException } from '@nestjs/common';
import {
  type DataSource,
  type EntityManager,
  FindOperator,
  type FindOptionsWhere,
} from 'typeorm';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { type EncryptedString } from 'src/engine/core-modules/secret-encryption/branded-strings/encrypted-string.type';
import { type EnvironmentConfigDriver } from 'src/engine/core-modules/twenty-config/drivers/environment-config.driver';
import { type HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { resolveAndValidateHostname } from 'src/engine/core-modules/secure-http-client/utils/resolve-and-validate-hostname.util';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';

import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
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
    existsBy: jest.fn(
      async (
        where:
          | FindOptionsWhere<HermesConnectionEntity>
          | FindOptionsWhere<HermesConnectionEntity>[],
      ) => {
        const alternatives = Array.isArray(where) ? where : [where];
        return rows.some((row) =>
          alternatives.some((scope) =>
            Object.entries(scope).every(([key, value]) =>
              value instanceof FindOperator
                ? row[key as keyof HermesConnectionEntity] !== value.value
                : row[key as keyof HermesConnectionEntity] === value,
            ),
          ),
        );
      },
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
    updatedAt: new Date(),
    handleAliases: [] as string[],
    connectionParameters: {
      IMAP: {
        connectionSecurity: 'SSL_TLS',
        host: 'imap.example.com',
        port: 993,
        username: 'hello@example.com',
        password: '' as EncryptedString,
      },
      SMTP: {
        connectionSecurity: 'STARTTLS',
        host: 'smtp.example.com',
        port: 587,
        username: 'hello@example.com',
        password: '' as EncryptedString,
      },
    },
  };
  const accounts = { findOne: jest.fn(async () => account) };
  const conversations: Partial<HermesConversationEntity>[] = [];
  const policies: Partial<HermesBotPolicyEntity>[] = [];
  const conversationRepository = {
    findOneBy: jest.fn(
      async (scope: { workspaceId: string; id: string }) =>
        conversations.find(
          (row) => row.workspaceId === scope.workspaceId && row.id === scope.id,
        ) ?? null,
    ),
    findBy: jest.fn(async (scope: { workspaceId: string; channel: string }) =>
      conversations.filter(
        (row) =>
          row.workspaceId === scope.workspaceId &&
          row.channel === scope.channel,
      ),
    ),
    update: jest.fn(
      async (
        scope: { id: string },
        changes: Partial<HermesConversationEntity>,
      ) => {
        Object.assign(
          conversations.find((row) => row.id === scope.id)!,
          changes,
        );
      },
    ),
  };
  const policyRepository = {
    findOneBy: jest.fn(async (scope: { workspaceId: string; scope: string }) =>
      policies.find(
        (row) =>
          row.workspaceId === scope.workspaceId && row.scope === scope.scope,
      ),
    ),
    save: jest.fn(async (row: Partial<HermesBotPolicyEntity>) => {
      const index = policies.findIndex(
        (item) =>
          item.workspaceId === row.workspaceId && item.scope === row.scope,
      );
      if (index === -1) policies.push(row);
      else policies[index] = row;
      return row;
    }),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === ConnectedAccountEntity
        ? accounts
        : entity === HermesConversationEntity
          ? conversationRepository
          : entity === HermesBotPolicyEntity
            ? policyRepository
            : repository,
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
  account.connectionParameters.IMAP.password = encryption.encryptVersioned(
    'synthetic-imap-password' as PlaintextString,
    { workspaceId },
  );
  account.connectionParameters.SMTP.password = encryption.encryptVersioned(
    'synthetic-smtp-password' as PlaintextString,
    { workspaceId },
  );
  const service = new HermesConnectionsService(
    source as unknown as DataSource,
    access as unknown as HermesProspectionAccessService,
    encryption,
    new ConnectedAccountTokenEncryptionService(encryption),
  );
  return {
    source,
    conversations,
    policies,
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

  it('transactionally invalidates AUTO grants and epochs on rotation and revocation', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const epoch = new Date();
    f.conversations.push(
      {
        id: 'wa',
        workspaceId,
        channel: 'WHATSAPP',
        botMode: 'AUTO',
        botOwnerUserWorkspaceId: userWorkspaceId,
        botModeUpdatedAt: epoch,
      },
      {
        id: 'mail',
        workspaceId,
        channel: 'EMAIL',
        botMode: 'AUTO',
        botOwnerUserWorkspaceId: userWorkspaceId,
        botModeUpdatedAt: epoch,
      },
    );
    const priorPolicy = f.policies.find(
      (row) => row.scope === 'WHATSAPP',
    )!.updatedAt!;
    await f.service.save(actor, {
      ...evolution,
      expectedRevision: 1,
      secrets: { ...evolution.secrets, apiKey: 'rotated-key' },
    });
    expect(f.conversations[0]).toMatchObject({
      botMode: 'MANUAL',
      botOwnerUserWorkspaceId: null,
    });
    expect(f.conversations[0].botModeUpdatedAt!.getTime()).toBeGreaterThan(
      epoch.getTime(),
    );
    expect(
      f.policies.find((row) => row.scope === 'WHATSAPP')!.updatedAt!.getTime(),
    ).toBeGreaterThan(priorPolicy.getTime());
    expect(f.conversations[1].botMode).toBe('AUTO');
    f.conversations[0].botMode = 'AUTO';
    f.conversations[0].botOwnerUserWorkspaceId = userWorkspaceId;
    await f.service.remove(actor, { kind: 'EVOLUTION', expectedRevision: 2 });
    expect(f.conversations[0].botOwnerUserWorkspaceId).toBeNull();
    expect(f.manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`hermes-messaging:${workspaceId}`],
    );
    await f.service.save(actor, {
      kind: 'MCP',
      expectedRevision: 0,
      settings: {
        endpoint: 'https://mcp.example.com/tools',
        toolName: 'draft',
        protocolVersion: '2025-11-25',
        argumentMap: { text: 'text' },
      },
      secrets: { token: 't'.repeat(32) },
    });
    expect(f.conversations[1]).toMatchObject({
      botMode: 'MANUAL',
      botOwnerUserWorkspaceId: null,
    });
  });

  it('preserves OFF, ASSISTED and INHERIT restrictions while revoking all old owners', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const epoch = new Date();
    for (const [index, botMode] of (
      ['OFF', 'ASSISTED', 'MANUAL', 'INHERIT'] as const
    ).entries())
      f.conversations.push({
        id: `wa-${index}`,
        workspaceId,
        channel: 'WHATSAPP',
        botMode,
        botOwnerUserWorkspaceId: userWorkspaceId,
        botModeUpdatedAt: epoch,
      });
    await f.service.save(actor, { ...evolution, expectedRevision: 1 });
    expect(f.conversations.map((row) => row.botMode)).toEqual([
      'OFF',
      'ASSISTED',
      'MANUAL',
      'INHERIT',
    ]);
    for (const conversation of f.conversations) {
      expect(conversation.botOwnerUserWorkspaceId).toBeNull();
      expect(conversation.botModeUpdatedAt!.getTime()).toBeGreaterThan(
        epoch.getTime(),
      );
    }
    await f.service.remove(actor, { kind: 'EVOLUTION', expectedRevision: 2 });
    expect(f.conversations.map((row) => row.botMode)).toEqual([
      'OFF',
      'ASSISTED',
      'MANUAL',
      'INHERIT',
    ]);
    expect(
      f.conversations.every((row) => row.botOwnerUserWorkspaceId === null),
    ).toBe(true);
  });

  it('continues to block MCP drafts under local OFF after configuration rotation and removal', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const id = '00000000-0000-4000-8000-000000000001';
    f.conversations.push({
      id,
      workspaceId,
      channel: 'WHATSAPP',
      botMode: 'OFF',
      botOwnerUserWorkspaceId: userWorkspaceId,
      botModeUpdatedAt: new Date(),
    });
    const messaging = new HermesMessagingService(
      f.source as unknown as DataSource,
      f.access as never,
      { getBot: () => ({}) } as never,
      {} as never,
    );
    await f.service.save(actor, { ...evolution, expectedRevision: 1 });
    expect(
      await messaging.conversationBotPolicy(actor, { conversationId: id }),
    ).toMatchObject({
      effectiveMode: 'OFF',
      canDraft: false,
      canAutoReply: false,
    });
    await f.service.remove(actor, { kind: 'EVOLUTION', expectedRevision: 2 });
    expect(
      await messaging.conversationBotPolicy(actor, { conversationId: id }),
    ).toMatchObject({
      effectiveMode: 'OFF',
      canDraft: false,
      canAutoReply: false,
    });
  });

  it('reuses the supplied transaction manager for live grants without a second pool checkout', async () => {
    const f = fixture();
    const saved = await f.service.save(actor, evolution);
    f.access.assertAllowed.mockClear();
    await f.service.resolve(
      workspaceId,
      'EVOLUTION',
      f.manager as unknown as EntityManager,
    );
    expect(f.access.assertAllowed).toHaveBeenCalledWith(actor, f.manager);
    f.access.assertAllowed.mockClear();
    await f.service.resolveByConnectionId(
      saved.connectionId!,
      'EVOLUTION',
      f.manager as unknown as EntityManager,
    );
    expect(f.access.assertAllowed).toHaveBeenCalledWith(actor, f.manager);
  });

  it('checks a workspace transaction revision through only its native query callback', async () => {
    const f = fixture();
    const saved = await f.service.save(actor, evolution);
    const expected = {
      connectionId: saved.connectionId!,
      revision: saved.revision,
    };
    const query = jest.fn(async (sql: string, _parameters?: unknown[]) =>
      sql.startsWith('SELECT "revision"')
        ? [{ ...expected, enabled: true }]
        : [],
    );
    await f.service.assertRevisionViaQuery(
      workspaceId,
      'EVOLUTION',
      expected,
      query,
    );
    expect(query).toHaveBeenLastCalledWith(
      'SELECT "revision", "connectionId", "enabled" FROM core."hermesConnection" WHERE "workspaceId" = $1 AND "kind" = $2 LIMIT 1',
      [workspaceId, 'EVOLUTION'],
    );
    const changed = async () => [{ ...expected, revision: 2, enabled: true }];
    await expect(
      f.service.assertRevisionViaQuery(
        workspaceId,
        'EVOLUTION',
        expected,
        changed,
      ),
    ).rejects.toThrow('CONNECTION_REVISION_CONFLICT');
    await expect(
      f.service.assertRevisionViaQuery(
        workspaceId,
        'EVOLUTION',
        expected,
        async () => [],
      ),
    ).rejects.toThrow('CONNECTION_REVISION_CONFLICT');
  });

  it('rotates context identity on configuring-owner changes and requires explicit secrets', async () => {
    const f = fixture();
    const first = await f.service.save(actor, evolution);
    const other = {
      ...actor,
      userId: '00000000-0000-4000-8000-000000000001',
      userWorkspaceId: '00000000-0000-4000-8000-000000000002',
    };
    await expect(
      f.service.save(other, {
        ...evolution,
        expectedRevision: 1,
        secrets: undefined,
      }),
    ).rejects.toThrow('NEW_OWNER_REQUIRES_SECRETS');
    const next = await f.service.save(other, {
      ...evolution,
      expectedRevision: 1,
    });
    expect(next.connectionId).not.toBe(first.connectionId);
    expect(await f.service.resolve(workspaceId, 'EVOLUTION')).toMatchObject({
      userWorkspaceId: other.userWorkspaceId,
      userId: other.userId,
    });
  });

  it('waits for the shared workspace lock and reloads revoked configuration inside caller transactions', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    f.manager.query.mockImplementationOnce(async () => {
      f.rows[0] = {
        ...f.rows[0],
        enabled: false,
        configuration: null,
        revision: 2,
      };
    });
    expect(
      await f.service.resolve(
        workspaceId,
        'EVOLUTION',
        f.manager as unknown as EntityManager,
      ),
    ).toBeNull();
    expect(f.manager.query).toHaveBeenLastCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`hermes-messaging:${workspaceId}`],
    );
  });

  it('ignores health metadata and re-encryption but rejects changed native mailbox credentials until rebind', async () => {
    const f = fixture();
    const settings = { connectedAccountId: f.account.id, mailbox: 'INBOX' };
    const first = await f.service.save(actor, {
      kind: 'MAIL',
      expectedRevision: 0,
      settings,
    });
    expect(JSON.stringify(first)).not.toContain('mailCredentialDigest');
    f.account.updatedAt = new Date(Date.now() + 1000);
    f.account.handleAliases = ['alias@example.com'];
    f.account.connectionParameters.SMTP.password =
      f.encryption.encryptVersioned(
        'synthetic-smtp-password' as PlaintextString,
        { workspaceId },
      );
    expect(await f.service.resolve(workspaceId, 'MAIL')).toMatchObject({
      connectionId: first.connectionId,
    });
    f.account.connectionParameters.SMTP.password =
      f.encryption.encryptVersioned(
        'changed-native-password' as PlaintextString,
        { workspaceId },
      );
    await expect(f.service.resolve(workspaceId, 'MAIL')).rejects.toThrow(
      'MAIL_ACCOUNT_CHANGED',
    );
    const rebound = await f.service.save(actor, {
      kind: 'MAIL',
      expectedRevision: 1,
      settings,
    });
    expect(rebound.connectionId).toBe(first.connectionId);
    expect(await f.service.resolve(workspaceId, 'MAIL')).toMatchObject({
      revision: 2,
    });
    expect(
      JSON.stringify(await f.service.resolve(workspaceId, 'MAIL')),
    ).not.toContain('mailCredentialDigest');
  });

  it('isolates uniqueness checks from another workspace corrupt ciphertext but rejects its reserved hash', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const corrupt = 'enc:v2:missing-key:invalid-payload' as EncryptedString;
    f.rows[0].configuration = corrupt;
    const decrypt = jest.spyOn(f.encryption, 'decryptVersionedOrThrow');
    const other = {
      ...actor,
      workspaceId: '00000000-0000-4000-8000-000000000001',
      userWorkspaceId: '00000000-0000-4000-8000-000000000002',
    };
    const different = {
      ...evolution,
      settings: { ...evolution.settings, instanceName: 'different' },
      secrets: { ...evolution.secrets, webhookSecret: 'b'.repeat(64) },
    };
    expect(await f.service.save(other, different)).toMatchObject({
      revision: 1,
      state: 'CONFIGURED_UNVERIFIED',
    });
    expect(
      decrypt.mock.calls.some(([ciphertext]) => ciphertext === corrupt),
    ).toBe(false);
    await expect(
      f.service.save(
        { ...other, workspaceId: '00000000-0000-4000-8000-000000000003' },
        { ...different, secrets: evolution.secrets },
      ),
    ).rejects.toThrow('CONNECTION_IDENTITY_ALREADY_BOUND');
    expect(
      decrypt.mock.calls.some(([ciphertext]) => ciphertext === corrupt),
    ).toBe(false);
    expect(JSON.stringify(await f.service.list(other))).not.toContain(
      'secretHash',
    );
    expect(
      JSON.stringify(await f.service.resolve(other.workspaceId, 'EVOLUTION')),
    ).not.toContain('secretHash');
  });

  it('revalidates decrypted native configuration and required actor fields without performing DNS', async () => {
    const f = fixture();
    await f.service.save(actor, evolution);
    const original = f.rows[0].configuration!;
    const payload = JSON.parse(
      f.encryption.decryptVersionedOrThrow(original, { workspaceId }),
    );
    const write = (value: unknown) => {
      f.rows[0].configuration = f.encryption.encryptVersioned(
        JSON.stringify(value) as PlaintextString,
        { workspaceId },
      );
    };
    jest.mocked(resolveAndValidateHostname).mockClear();
    write({
      ...payload,
      secrets: { ...payload.secrets, apiKey: 'invalid\nheader' },
    });
    await expect(f.service.resolve(workspaceId, 'EVOLUTION')).rejects.toThrow(
      'CONNECTION_CONFIGURATION_UNAVAILABLE',
    );
    const { userId: _missing, ...withoutActor } = payload;
    write(withoutActor);
    await expect(f.service.resolve(workspaceId, 'EVOLUTION')).rejects.toThrow(
      'CONNECTION_CONFIGURATION_UNAVAILABLE',
    );
    write({
      ...payload,
      settings: { ...payload.settings, baseUrl: 'http://127.0.0.1:9000' },
    });
    await expect(f.service.resolve(workspaceId, 'EVOLUTION')).rejects.toThrow(
      'CONNECTION_CONFIGURATION_UNAVAILABLE',
    );
    f.rows[0].configuration = original;
    expect(await f.service.resolve(workspaceId, 'EVOLUTION')).toMatchObject({
      revision: 1,
    });
    expect(resolveAndValidateHostname).not.toHaveBeenCalled();
  });

  it('rejects a secret fingerprint that no longer matches the decrypted native token', async () => {
    const f = fixture();
    await f.service.save(actor, {
      kind: 'INTAKE',
      expectedRevision: 0,
      settings: { allowedSources: ['SCRAPING'], maxRequestsPerMinute: 10 },
      secrets: { secret: 'a'.repeat(64) },
    });
    const payload = JSON.parse(
      f.encryption.decryptVersionedOrThrow(f.rows[0].configuration!, {
        workspaceId,
      }),
    );
    payload.secrets.secret = 'b'.repeat(64);
    f.rows[0].configuration = f.encryption.encryptVersioned(
      JSON.stringify(payload) as PlaintextString,
      { workspaceId },
    );
    await expect(f.service.resolve(workspaceId, 'INTAKE')).rejects.toThrow(
      'CONNECTION_CONFIGURATION_UNAVAILABLE',
    );
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
