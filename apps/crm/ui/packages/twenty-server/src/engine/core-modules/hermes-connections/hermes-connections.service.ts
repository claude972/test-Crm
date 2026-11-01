import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { DataSource, type EntityManager, IsNull, Not } from 'typeorm';
import { z } from 'zod';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { SecretEncryptionService } from 'src/engine/core-modules/secret-encryption/secret-encryption.service';
import { type PlaintextString } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { resolveAndValidateHostname } from 'src/engine/core-modules/secure-http-client/utils/resolve-and-validate-hostname.util';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import {
  managedEvolutionSchema,
  managedInstanceName,
  managedConnectionMatches,
  provisionerConfiguration,
  effectiveWhatsappMode,
  type ManagedEvolution,
} from 'src/engine/core-modules/hermes-connectors/evolution/enrollment/evolution-enrollment.policy';
import { EmailConnectionSecurity } from 'src/engine/core-modules/imap-smtp-caldav-connection/enums/email-connection-security.enum';

import {
  HermesConnectionEntity,
  type HermesConnectionKind,
} from './hermes-connection.entity';
import {
  connectionIdentity,
  connectionSecretHash,
  connectionKind,
  validateConnectionConfiguration,
  type HermesConnectionConfiguration,
} from './hermes-connections.policy';

const writeSchema = z
  .object({
    kind: connectionKind,
    expectedRevision: z.number().int().min(0).max(2147483646),
    settings: z.record(z.string(), z.unknown()),
    secrets: z.record(z.string(), z.string()).optional(),
  })
  .strict();
const removeSchema = z
  .object({
    kind: connectionKind,
    expectedRevision: z.number().int().min(1).max(2147483646),
  })
  .strict();

const storedConfigurationSchema = z
  .object({
    workspaceId: z.string().uuid(),
    kind: connectionKind,
    userId: z.string().uuid(),
    userWorkspaceId: z.string().uuid(),
    settings: z.record(z.string(), z.unknown()),
    secrets: z.record(z.string(), z.string()),
    managedEvolution: managedEvolutionSchema.optional(),
    mailCredentialDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

type StoredConfiguration = HermesConnectionConfiguration & {
  workspaceId: string;
  kind: HermesConnectionKind;
  userId: string;
  userWorkspaceId: string;
  mailCredentialDigest?: string;
  managedEvolution?: ManagedEvolution;
};
export type HermesResolvedConnection = HermesConnectionConfiguration & {
  workspaceId: string;
  connectionId: string;
  revision: number;
  managedEvolution?: ManagedEvolution;
  userId: string;
  userWorkspaceId: string;
};
export type HermesConnectionView = {
  kind: HermesConnectionKind;
  connectionId: string | null;
  revision: number;
  state: 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED';
  settings: Record<string, unknown>;
  secretFields: string[];
  updatedAt: Date | null;
};

@Injectable()
export class HermesConnectionsService {
  constructor(
    @InjectDataSource() private readonly source: DataSource,
    private readonly access: HermesProspectionAccessService,
    private readonly encryption: SecretEncryptionService,
    private readonly accountEncryption: ConnectedAccountTokenEncryptionService,
    @Optional() private readonly config?: KovaaLabCRMConfigService,
  ) {}

  private transaction<T>(
    workspaceId: string,
    action: (manager: EntityManager) => Promise<T>,
  ) {
    return this.source.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-messaging:${workspaceId}`],
      );
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-connections:${workspaceId}`],
      );
      return action(manager);
    });
  }

  private async revokeGrants(
    actor: HermesMessagingActor,
    kind: HermesConnectionKind,
    manager: EntityManager,
  ) {
    const channels =
      kind === 'EVOLUTION'
        ? ['WHATSAPP']
        : kind === 'MAIL'
          ? ['EMAIL']
          : kind === 'MCP'
            ? ['WHATSAPP', 'EMAIL']
            : [];
    const conversations = manager.getRepository(HermesConversationEntity);
    const policies = manager.getRepository(HermesBotPolicyEntity);
    for (const channel of channels) {
      const current = await conversations.findBy({
        workspaceId: actor.workspaceId,
        channel: channel as 'WHATSAPP' | 'EMAIL',
      });
      for (const conversation of current) {
        await conversations.update(
          { workspaceId: actor.workspaceId, id: conversation.id },
          {
            botMode:
              conversation.botMode === 'AUTO' ? 'MANUAL' : conversation.botMode,
            botOwnerUserWorkspaceId: null,
            botModeUpdatedAt: new Date(
              Math.max(
                Date.now(),
                (conversation.botModeUpdatedAt?.getTime() ?? 0) + 1,
              ),
            ),
          },
        );
      }
      const scope = channel as 'WHATSAPP' | 'EMAIL';
      const policy = await policies.findOneBy({
        workspaceId: actor.workspaceId,
        scope,
      });
      await policies.save({
        workspaceId: actor.workspaceId,
        scope,
        mode: policy?.mode ?? 'INHERIT',
        updatedAt: new Date(
          Math.max(Date.now(), (policy?.updatedAt?.getTime() ?? 0) + 1),
        ),
        updatedByUserWorkspaceId: actor.userWorkspaceId,
      });
    }
  }

  private decrypt(row: HermesConnectionEntity): StoredConfiguration {
    try {
      if (!row.configuration) throw new Error();
      const decoded = storedConfigurationSchema.parse(
        JSON.parse(
          this.encryption.decryptVersionedOrThrow(row.configuration, {
            workspaceId: row.workspaceId,
          }),
        ),
      );
      if (
        decoded.workspaceId !== row.workspaceId ||
        decoded.kind !== row.kind ||
        decoded.userWorkspaceId !== row.updatedByUserWorkspaceId
      )
        throw new Error();
      if (decoded.managedEvolution && decoded.kind !== 'EVOLUTION')
        throw new Error();
      if (
        decoded.managedEvolution &&
        decoded.settings.instanceName !== managedInstanceName(row.workspaceId)
      )
        throw new Error();
      const { handle, ...mailSettings } = decoded.settings;
      const native = validateConnectionConfiguration(
        row.workspaceId,
        row.kind,
        {
          settings: row.kind === 'MAIL' ? mailSettings : decoded.settings,
          secrets: decoded.secrets,
        },
      );
      if (row.kind === 'MAIL') {
        if (
          typeof handle !== 'string' ||
          !handle ||
          handle.length > 320 ||
          /[\r\n\x00]/.test(handle)
        )
          throw new Error();
        native.settings = { ...native.settings, handle };
      }
      if (
        (row.kind === 'EVOLUTION' || row.kind === 'MCP') &&
        new URL(
          String(
            native.settings[row.kind === 'EVOLUTION' ? 'baseUrl' : 'endpoint'],
          ),
        ).protocol !== 'https:'
      )
        throw new Error();
      return { ...decoded, ...native };
    } catch {
      throw new ServiceUnavailableException(
        'CONNECTION_CONFIGURATION_UNAVAILABLE',
      );
    }
  }

  private view(row: HermesConnectionEntity): HermesConnectionView {
    if (!row.enabled)
      return {
        kind: row.kind,
        connectionId: null,
        revision: row.revision,
        state: 'NOT_CONFIGURED',
        settings: {},
        secretFields: [],
        updatedAt: row.updatedAt,
      };
    const configuration = this.decrypt(row);
    return {
      kind: row.kind,
      connectionId: row.connectionId,
      revision: row.revision,
      state: 'CONFIGURED_UNVERIFIED',
      settings: configuration.settings,
      secretFields: Object.keys(configuration.secrets),
      updatedAt: row.updatedAt,
    };
  }

  async list(actor: HermesMessagingActor): Promise<HermesConnectionView[]> {
    await this.access.assertAllowed(actor);
    const rows = await this.source
      .getRepository(HermesConnectionEntity)
      .findBy({ workspaceId: actor.workspaceId });
    const result = connectionKind.options.map((kind) => {
      const row = rows.find((item) => item.kind === kind);
      return row
        ? this.view(row)
        : {
            kind,
            connectionId: null,
            revision: 0,
            state: 'NOT_CONFIGURED' as const,
            settings: {},
            secretFields: [],
            updatedAt: null,
          };
    });
    await this.access.assertAllowed(actor);
    return result;
  }

  private async mailbox(
    actor: HermesMessagingActor,
    settings: Record<string, unknown>,
    manager: EntityManager,
  ) {
    const account = await manager
      .getRepository(ConnectedAccountEntity)
      .findOne({
        where: {
          id: settings.connectedAccountId as string,
          workspaceId: actor.workspaceId,
          userWorkspaceId: actor.userWorkspaceId,
          archivedAt: IsNull(),
        },
      });
    const secure = (security: unknown) =>
      security === EmailConnectionSecurity.SSL_TLS ||
      security === EmailConnectionSecurity.STARTTLS;
    if (
      !account ||
      account.provider !== ConnectedAccountProvider.IMAP_SMTP_CALDAV ||
      !secure(account.connectionParameters?.IMAP?.connectionSecurity) ||
      !secure(account.connectionParameters?.SMTP?.connectionSecurity) ||
      account.authFailedAt
    )
      throw new BadRequestException('MAIL_ACCOUNT_UNAVAILABLE');
    try {
      const protocols = (['IMAP', 'SMTP'] as const).map((protocol) => {
        const encrypted = account.connectionParameters?.[protocol];
        if (!encrypted) throw new Error();
        const plaintext = this.accountEncryption.decryptProtocolPassword({
          protocolParams: encrypted,
          workspaceId: actor.workspaceId,
        });
        return [
          protocol,
          plaintext.host,
          plaintext.port,
          plaintext.connectionSecurity,
          plaintext.username ?? null,
          plaintext.password,
        ];
      });
      return {
        settings: { ...settings, handle: account.handle.trim().toLowerCase() },
        credentialDigest: createHash('sha256')
          .update(
            JSON.stringify([
              account.provider,
              account.handle.trim().toLowerCase(),
              account.userWorkspaceId,
              ...protocols,
            ]),
          )
          .digest('hex'),
      };
    } catch {
      throw new ServiceUnavailableException('MAIL_ACCOUNT_UNAVAILABLE');
    }
  }

  async save(
    actor: HermesMessagingActor,
    value: unknown,
  ): Promise<HermesConnectionView> {
    const parsed = writeSchema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException('CONNECTION_INPUT_INVALID');
    const input = parsed.data;
    await this.access.assertAllowed(actor);
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConnectionEntity);
      const row = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        kind: input.kind,
      });
      if ((row?.revision ?? 0) !== input.expectedRevision)
        throw new ConflictException('CONNECTION_REVISION_CONFLICT');
      const previous = row?.enabled ? this.decrypt(row) : null;
      if (previous?.managedEvolution)
        throw new ConflictException('WA_CONNECTION_MANAGED');
      let configuration = validateConnectionConfiguration(
        actor.workspaceId,
        input.kind,
        {
          settings: input.settings,
          secrets: input.secrets ?? previous?.secrets ?? {},
        },
      );
      let mailCredentialDigest: string | undefined;
      if (input.kind === 'MAIL') {
        const native = await this.mailbox(
          actor,
          configuration.settings,
          manager,
        );
        configuration = { ...configuration, settings: native.settings };
        mailCredentialDigest = native.credentialDigest;
      }
      const identityHash = connectionIdentity(
        input.kind,
        configuration.settings,
      );
      if (
        previous &&
        (row?.identityHash !== identityHash ||
          previous.userWorkspaceId !== actor.userWorkspaceId) &&
        input.secrets === undefined &&
        Object.keys(previous.secrets).length
      )
        throw new BadRequestException(
          previous.userWorkspaceId !== actor.userWorkspaceId
            ? 'NEW_OWNER_REQUIRES_SECRETS'
            : 'CONNECTION_NEW_IDENTITY_REQUIRES_SECRETS',
        );
      if (input.kind === 'MCP' || input.kind === 'EVOLUTION') {
        const endpoint = String(
          input.kind === 'MCP'
            ? configuration.settings.endpoint
            : configuration.settings.baseUrl,
        );
        if (new URL(endpoint).protocol !== 'https:')
          throw new BadRequestException('CONNECTION_REQUIRES_HTTPS');
        try {
          await resolveAndValidateHostname(new URL(endpoint).hostname, []);
        } catch {
          throw new BadRequestException('CONNECTION_ENDPOINT_NOT_PUBLIC');
        }
      }
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-connections-provider:${input.kind}`],
      );
      const secretHash = connectionSecretHash(
        input.kind,
        configuration.secrets,
      );
      if (input.kind !== 'MAIL') {
        if (!secretHash)
          throw new BadRequestException('CONNECTION_CONFIGURATION_INVALID');
        const scope = {
          kind: input.kind,
          enabled: true,
          workspaceId: Not(actor.workspaceId),
        };
        const collision =
          input.kind === 'EVOLUTION'
            ? [
                { ...scope, identityHash },
                { ...scope, secretHash },
              ]
            : { ...scope, secretHash };
        if (await repository.existsBy(collision))
          throw new ConflictException('CONNECTION_IDENTITY_ALREADY_BOUND');
      }
      await this.access.assertAllowed(actor, manager);
      const stored: StoredConfiguration = {
        ...configuration,
        ...(mailCredentialDigest ? { mailCredentialDigest } : {}),
        workspaceId: actor.workspaceId,
        kind: input.kind,
        userId: actor.userId,
        userWorkspaceId: actor.userWorkspaceId,
      };
      const updated = repository.create({
        ...(row ? { id: row.id } : {}),
        workspaceId: actor.workspaceId,
        kind: input.kind,
        connectionId:
          row?.enabled &&
          row.identityHash === identityHash &&
          row.updatedByUserWorkspaceId === actor.userWorkspaceId
            ? row.connectionId
            : randomUUID(),
        revision: (row?.revision ?? 0) + 1,
        enabled: true,
        identityHash,
        secretHash,
        configuration: this.encryption.encryptVersioned(
          JSON.stringify(stored) as PlaintextString,
          { workspaceId: actor.workspaceId },
        ),
        updatedAt: new Date(),
        updatedByUserWorkspaceId: actor.userWorkspaceId,
      });
      await this.revokeGrants(actor, input.kind, manager);
      await repository.save(updated);
      return this.view(updated);
    });
  }

  private managedProvisioner() {
    try {
      const value = provisionerConfiguration({
        enabled: this.config?.get('HERMES_EVOLUTION_PROVISIONER_ENABLED'),
        baseUrl: this.config?.get('HERMES_EVOLUTION_PROVISIONER_BASE_URL'),
        apiKey: this.config?.get('HERMES_EVOLUTION_PROVISIONER_API_KEY'),
      });
      if (!value) throw new Error();
      return value;
    } catch {
      throw new ServiceUnavailableException('WA_PROVISIONER_NOT_CONFIGURED');
    }
  }

  async managedWhatsappBotMode(
    actor: HermesMessagingActor,
    manager?: EntityManager,
  ) {
    await this.access.assertAllowed(actor, manager);
    const repository = (manager ?? this.source).getRepository(
      HermesBotPolicyEntity,
    );
    const parent = await repository.findOneBy({
      workspaceId: actor.workspaceId,
      scope: 'WORKSPACE',
    });
    const channel = await repository.findOneBy({
      workspaceId: actor.workspaceId,
      scope: 'WHATSAPP',
    });
    await this.access.assertAllowed(actor, manager);
    return effectiveWhatsappMode(parent?.mode, channel?.mode);
  }

  async managedEnrollmentSnapshot(
    actor: HermesMessagingActor,
    expectedRevision: number,
  ) {
    await this.access.assertAllowed(actor);
    const row = await this.source
      .getRepository(HermesConnectionEntity)
      .findOneBy({ workspaceId: actor.workspaceId, kind: 'EVOLUTION' });
    if ((row?.revision ?? 0) !== expectedRevision)
      throw new ConflictException('CONNECTION_REVISION_CONFLICT');
    const connection = row?.enabled
      ? await this.resolve(actor.workspaceId, 'EVOLUTION')
      : null;
    if (connection && connection.revision !== expectedRevision)
      throw new ConflictException('CONNECTION_REVISION_CONFLICT');
    if (connection && !connection.managedEvolution)
      throw new ConflictException('WA_CONNECTION_NOT_MANAGED');
    if (
      connection &&
      !managedConnectionMatches(
        actor.workspaceId,
        connection.settings,
        this.managedProvisioner().baseUrl,
      )
    )
      throw new ConflictException('WA_CONNECTION_NOT_MANAGED');
    await this.access.assertAllowed(actor);
    return {
      connection,
      revision: row?.revision ?? 0,
      botMode: await this.managedWhatsappBotMode(actor),
    };
  }

  async reserveManagedEvolution(
    actor: HermesMessagingActor,
    expectedRevision: number,
  ) {
    await this.access.assertAllowed(actor);
    const operator = this.managedProvisioner();
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConnectionEntity);
      const row = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        kind: 'EVOLUTION',
      });
      if ((row?.revision ?? 0) !== expectedRevision)
        throw new ConflictException('CONNECTION_REVISION_CONFLICT');
      if (row?.enabled) {
        const previous = this.decrypt(row);
        if (
          !previous.managedEvolution ||
          !managedConnectionMatches(
            actor.workspaceId,
            previous.settings,
            operator.baseUrl,
          )
        )
          throw new ConflictException('WA_CONNECTION_NOT_MANAGED');
        return { created: false, revision: row.revision };
      }
      const configuration = validateConnectionConfiguration(
        actor.workspaceId,
        'EVOLUTION',
        {
          settings: {
            baseUrl: operator.baseUrl,
            instanceName: managedInstanceName(actor.workspaceId),
          },
          secrets: {
            apiKey: randomBytes(32).toString('hex'),
            webhookSecret: randomBytes(32).toString('hex'),
          },
        },
      );
      const identityHash = connectionIdentity(
        'EVOLUTION',
        configuration.settings,
      );
      const secretHash = connectionSecretHash(
        'EVOLUTION',
        configuration.secrets,
      );
      if (!secretHash)
        throw new BadRequestException('WA_ENROLLMENT_SECRET_INVALID');
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        ['hermes-connections-provider:EVOLUTION'],
      );
      if (
        await repository.existsBy([
          {
            kind: 'EVOLUTION',
            enabled: true,
            workspaceId: Not(actor.workspaceId),
            identityHash,
          },
          {
            kind: 'EVOLUTION',
            enabled: true,
            workspaceId: Not(actor.workspaceId),
            secretHash,
          },
        ])
      )
        throw new ConflictException('CONNECTION_IDENTITY_ALREADY_BOUND');
      const stored: StoredConfiguration = {
        ...configuration,
        workspaceId: actor.workspaceId,
        kind: 'EVOLUTION',
        userId: actor.userId,
        userWorkspaceId: actor.userWorkspaceId,
        managedEvolution: {
          version: 1,
          operationId: randomUUID(),
          phase: 'PROVISIONING',
        },
      };
      const updated = repository.create({
        ...(row ? { id: row.id } : {}),
        workspaceId: actor.workspaceId,
        kind: 'EVOLUTION',
        connectionId: randomUUID(),
        revision: (row?.revision ?? 0) + 1,
        enabled: true,
        identityHash,
        secretHash,
        configuration: this.encryption.encryptVersioned(
          JSON.stringify(stored) as PlaintextString,
          { workspaceId: actor.workspaceId },
        ),
        updatedAt: new Date(),
        updatedByUserWorkspaceId: actor.userWorkspaceId,
      });
      await this.revokeGrants(actor, 'EVOLUTION', manager);
      await manager.getRepository(HermesBotPolicyEntity).save({
        workspaceId: actor.workspaceId,
        scope: 'WHATSAPP',
        mode: 'OFF',
        updatedAt: new Date(),
        updatedByUserWorkspaceId: actor.userWorkspaceId,
      });
      await this.access.assertAllowed(actor, manager);
      await repository.save(updated);
      return { created: true, revision: updated.revision };
    });
  }

  async transitionManagedEvolution(
    actor: HermesMessagingActor,
    expectedRevision: number,
    phase: ManagedEvolution['phase'],
  ) {
    await this.access.assertAllowed(actor);
    const operator = this.managedProvisioner();
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConnectionEntity);
      const row = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        kind: 'EVOLUTION',
        enabled: true,
      });
      if (!row || row.revision !== expectedRevision)
        throw new ConflictException('CONNECTION_REVISION_CONFLICT');
      const stored = this.decrypt(row);
      const previous = stored.managedEvolution;
      if (
        !previous ||
        !managedConnectionMatches(
          actor.workspaceId,
          stored.settings,
          operator.baseUrl,
        )
      )
        throw new ConflictException('WA_CONNECTION_NOT_MANAGED');
      if (
        (phase === 'ACTIVATING' || phase === 'ACTIVE') &&
        (await this.managedWhatsappBotMode(actor, manager)) !== 'OFF'
      )
        throw new ConflictException('WA_BOT_MUST_BE_OFF');
      const allowed: Record<
        ManagedEvolution['phase'],
        ManagedEvolution['phase'][]
      > = {
        PROVISIONING: [
          'AWAITING_PAIRING',
          'PROVISIONING_UNCONFIRMED',
          'BLOCKED',
          'ACTIVATING',
        ],
        PROVISIONING_UNCONFIRMED: ['ACTIVATING'],
        AWAITING_PAIRING: ['ACTIVATING'],
        ACTIVATING: ['ACTIVE'],
        ACTIVE: [],
        BLOCKED: [],
      };
      if (phase === previous.phase) return row.revision;
      if (!allowed[previous.phase].includes(phase))
        throw new ConflictException('WA_ENROLLMENT_TRANSITION_INVALID');
      stored.managedEvolution = managedEvolutionSchema.parse({
        ...previous,
        phase,
        ...(phase === 'ACTIVATING' && previous.cutoffSeconds === undefined
          ? { cutoffSeconds: Math.floor(Date.now() / 1000) }
          : {}),
      });
      row.configuration = this.encryption.encryptVersioned(
        JSON.stringify(stored) as PlaintextString,
        { workspaceId: actor.workspaceId },
      );
      row.revision++;
      row.updatedAt = new Date();
      // State transitions retain the original encrypted owner and connection identity.
      await this.access.assertAllowed(actor, manager);
      await repository.save(row);
      return row.revision;
    });
  }

  async remove(
    actor: HermesMessagingActor,
    value: unknown,
  ): Promise<HermesConnectionView> {
    const parsed = removeSchema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException('CONNECTION_INPUT_INVALID');
    await this.access.assertAllowed(actor);
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConnectionEntity);
      const row = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        kind: parsed.data.kind,
      });
      if (!row || row.revision !== parsed.data.expectedRevision)
        throw new ConflictException('CONNECTION_REVISION_CONFLICT');
      if (row.enabled && this.decrypt(row).managedEvolution)
        throw new ConflictException('WA_CONNECTION_MANAGED');
      row.enabled = false;
      row.configuration = null;
      row.secretHash = null;
      row.revision++;
      row.updatedAt = new Date();
      row.updatedByUserWorkspaceId = actor.userWorkspaceId;
      await this.revokeGrants(actor, row.kind, manager);
      await repository.save(row);
      return this.view(row);
    });
  }

  async assertRevisionViaQuery(
    workspaceId: string,
    kind: HermesConnectionKind,
    expected: { connectionId: string; revision: number },
    query: (
      sql: string,
      parameters?: unknown[],
    ) => Promise<Record<string, unknown>[]>,
  ) {
    await query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `hermes-messaging:${workspaceId}`,
    ]);
    const rows = await query(
      'SELECT "revision", "connectionId", "enabled" FROM core."hermesConnection" WHERE "workspaceId" = $1 AND "kind" = $2 LIMIT 1',
      [workspaceId, kind],
    );
    const row = rows[0];
    if (
      !row ||
      row.enabled !== true ||
      row.connectionId !== expected.connectionId ||
      row.revision !== expected.revision
    )
      throw new ConflictException('CONNECTION_REVISION_CONFLICT');
  }

  async workspaceIds(kind: HermesConnectionKind): Promise<string[]> {
    const rows = await this.source
      .getRepository(HermesConnectionEntity)
      .findBy({ kind, enabled: true });
    return rows.map((row) => row.workspaceId);
  }

  async resolveByConnectionId(
    connectionId: string,
    kind: HermesConnectionKind,
    manager?: EntityManager,
  ): Promise<HermesResolvedConnection | null> {
    if (!z.string().uuid().safeParse(connectionId).success) return null;
    const row = await (manager ?? this.source)
      .getRepository(HermesConnectionEntity)
      .findOneBy({ connectionId, kind, enabled: true });
    if (!row) return null;
    const resolved = await this.resolve(row.workspaceId, kind, manager);
    return resolved?.connectionId === connectionId ? resolved : null;
  }

  // Adapters must resolve again and compare revision/connectionId before any side effect.
  async resolve(
    workspaceId: string,
    kind: HermesConnectionKind,
    manager?: EntityManager,
  ): Promise<HermesResolvedConnection | null> {
    if (manager)
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-messaging:${workspaceId}`],
      );
    const row = await (manager ?? this.source)
      .getRepository(HermesConnectionEntity)
      .findOneBy({ workspaceId, kind });
    if (!row?.enabled) return null;
    const configuration = this.decrypt(row);
    if (
      connectionIdentity(kind, configuration.settings) !== row.identityHash ||
      connectionSecretHash(kind, configuration.secrets) !== row.secretHash
    )
      throw new ServiceUnavailableException(
        'CONNECTION_CONFIGURATION_UNAVAILABLE',
      );
    const actor = {
      workspaceId,
      userId: configuration.userId,
      userWorkspaceId: configuration.userWorkspaceId,
    };
    await this.access.assertAllowed(actor, manager);
    if (kind === 'MAIL') {
      const current = await this.mailbox(
        actor,
        {
          connectedAccountId: configuration.settings.connectedAccountId,
          mailbox: configuration.settings.mailbox,
        },
        manager ?? this.source.manager,
      );
      if (connectionIdentity(kind, current.settings) !== row.identityHash)
        throw new ServiceUnavailableException('MAIL_IDENTITY_CHANGED');
      if (configuration.mailCredentialDigest !== current.credentialDigest)
        throw new ServiceUnavailableException('MAIL_ACCOUNT_CHANGED');
    }
    const fresh = await (manager ?? this.source)
      .getRepository(HermesConnectionEntity)
      .findOneBy({ workspaceId, kind });
    await this.access.assertAllowed(actor, manager);
    if (
      !fresh?.enabled ||
      fresh.connectionId !== row.connectionId ||
      fresh.revision !== row.revision
    )
      throw new ConflictException('CONNECTION_REVISION_CONFLICT');
    return {
      workspaceId: configuration.workspaceId,
      userId: configuration.userId,
      userWorkspaceId: configuration.userWorkspaceId,
      settings: configuration.settings,
      secrets: configuration.secrets,
      connectionId: row.connectionId,
      revision: row.revision,
      ...(configuration.managedEvolution
        ? { managedEvolution: configuration.managedEvolution }
        : {}),
    };
  }
}
