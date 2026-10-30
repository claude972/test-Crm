import {
  BadRequestException,
  ConflictException,
  Injectable,
  Inject,
  Optional,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { type HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import {
  type HermesEmailReplyInput,
  type HermesEmailEnvelope,
  type HermesInboxReplyV3Input,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { InjectDataSource } from '@nestjs/typeorm';
import { WorkspaceActivationStatus } from 'kovaa-lab-shared/workspace';
import { DataSource, type EntityManager, IsNull } from 'typeorm';
import { z } from 'zod';
import { HermesBotPolicyEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-bot-policy.entity';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMessagingPersonService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service';
import {
  decodeMessagingCursor,
  encodeMessagingCursor,
  messagingDigest,
  messagingEventSchema,
  messagingId,
  messagingText,
  normalizeContactHandle,
  pageLimit,
} from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';
import {
  type HermesInboxConversationsInput,
  type HermesInboxMessagesInput,
  type HermesInboxReplyInput,
  type HermesMessagingActor,
  type HermesMessagingChannel,
  type HermesMessagingEvent,
  type HermesMessagingBotResult,
  type HermesBotPolicyMode,
  type HermesBotPolicyOverrideMode,
  type HermesBotPolicyScope,
  type HermesConversationBotPolicy,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { HermesMessagingAccessService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-access.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

type BotGrant = { ownerUserWorkspaceId: string; epoch: string };
const replySchema = z
  .object({
    conversationId: z.string().uuid(),
    clientRequestId: z.string().uuid(),
    text: messagingText,
  })
  .strict();
const emailHeader = z
  .string()
  .max(998)
  .refine(
    (value) =>
      !/[\r\n\0]/.test(value) && Buffer.byteLength(value, 'utf8') <= 998,
  );
const emailAddress = z
  .string()
  .email()
  .max(254)
  .refine((value) => !/[\r\n\0]/.test(value));
const emailEnvelopeSchema = z
  .object({
    from: emailAddress,
    to: z.array(emailAddress).max(50),
    cc: z.array(emailAddress).max(50),
    bcc: z.array(emailAddress).max(50),
    subject: emailHeader,
    text: z
      .string()
      .max(20000)
      .refine((value) => !value.includes('\0')),
    html: z
      .string()
      .max(262144)
      .refine((value) => !value.includes('\0'))
      .optional(),
    inReplyTo: emailHeader.optional(),
    references: z.array(emailHeader).max(20).optional(),
    inlineAttachments: z
      .array(
        z
          .object({
            assetId: z.string().uuid(),
            cid: z
              .string()
              .min(1)
              .max(120)
              .regex(/^[A-Za-z0-9._-]+$/),
          })
          .strict(),
      )
      .max(10)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.to.length + value.cc.length + value.bcc.length > 0 &&
      value.to.length + value.cc.length + value.bcc.length <= 50,
  );
const receiptSchema = z.object({
  providerMessageId: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[\x21-\x7e]+$/),
  acceptedAt: z.string().datetime({ offset: true }),
});

@Injectable()
export class HermesMessagingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: HermesMessagingAccessService,
    private readonly registry: HermesMessagingAdapterRegistry,
    private readonly people: HermesMessagingPersonService,
    @Optional()
    @Inject('HERMES_MEDIA_SERVICE')
    private readonly media?: HermesMediaService,
  ) {}

  private transaction<T>(
    workspaceId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`hermes-messaging:${workspaceId}`],
      );
      return work(manager);
    });
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException('INVALID_MESSAGING_INPUT');
    return result.data;
  }
  private async conversation(
    workspaceId: string,
    id: string,
  ): Promise<HermesConversationEntity> {
    const result = await this.dataSource
      .getRepository(HermesConversationEntity)
      .findOneBy({ workspaceId, id });
    if (!result) throw new NotFoundException('CONVERSATION_NOT_FOUND');
    return result;
  }
  private async visibleMessage(
    workspaceId: string,
    message: HermesInboxMessageEntity,
  ): Promise<HermesInboxMessageEntity> {
    if (!message.canonicalMessageId) return message;
    const canonical = await this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .findOneBy({
        workspaceId,
        id: message.canonicalMessageId,
        conversationId: message.conversationId,
      });
    if (!canonical)
      throw new ServiceUnavailableException('MESSAGE_RECONCILIATION_REQUIRED');
    return canonical;
  }

  private async botPolicy(
    conversation: HermesConversationEntity,
    manager: Pick<EntityManager, 'getRepository'> = this.dataSource,
  ): Promise<HermesConversationBotPolicy> {
    const repository = manager.getRepository(HermesBotPolicyEntity);
    const workspace = await repository.findOneBy({
      workspaceId: conversation.workspaceId,
      scope: 'WORKSPACE',
    });
    const channel = await repository.findOneBy({
      workspaceId: conversation.workspaceId,
      scope: conversation.channel,
    });
    const rank: Record<string, number> = { OFF: 0, ASSISTED: 1, AUTO: 2 };
    const localMode =
      conversation.botMode === 'MANUAL' ? 'ASSISTED' : conversation.botMode;
    const workspaceMode = workspace?.mode ?? 'ASSISTED';
    const channelMode =
      channel?.mode === 'INHERIT'
        ? workspaceMode
        : (channel?.mode ?? workspaceMode);
    const localPolicy = localMode === 'INHERIT' ? 'AUTO' : localMode;
    const candidates = [
      { mode: workspaceMode, reason: 'WORKSPACE_POLICY' },
      { mode: channelMode, reason: 'CHANNEL_POLICY' },
      { mode: localPolicy, reason: 'LOCAL_POLICY' },
    ];
    const invalid = candidates.some(
      ({ mode }) => !['OFF', 'ASSISTED', 'AUTO'].includes(mode),
    );
    const effective = candidates.reduce((left, right) =>
      rank[right.mode] < rank[left.mode] ? right : left,
    );
    const effectiveMode = invalid
      ? 'OFF'
      : (effective.mode as HermesBotPolicyMode);
    const canDraft = effectiveMode !== 'OFF' && !!this.registry.getBot();
    return {
      conversationId: conversation.id,
      localMode,
      effectiveMode,
      reason: invalid ? 'BOT_POLICY_INVALID' : effective.reason,
      revision: messagingDigest([
        conversation.workspaceId,
        conversation.id,
        conversation.botMode,
        conversation.botModeUpdatedAt,
        workspace?.mode,
        workspace?.updatedAt,
        channel?.mode,
        channel?.updatedAt,
      ]),
      canDraft,
      canAutoReply:
        effectiveMode === 'AUTO' &&
        !!conversation.botOwnerUserWorkspaceId &&
        !!conversation.botModeUpdatedAt &&
        canDraft,
    };
  }

  async conversationBotPolicy(
    actor: HermesMessagingActor,
    raw: { conversationId: string },
  ) {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z.object({ conversationId: z.string().uuid() }).strict(),
      raw,
    );
    const result = await this.botPolicy(
      await this.conversation(actor.workspaceId, input.conversationId),
    );
    await this.access.assertAllowed(actor);
    return result;
  }

  private async workspaceBotPoliciesWithManager(
    workspaceId: string,
    manager: Pick<EntityManager, 'getRepository'> = this.dataSource,
  ) {
    return Promise.all(
      (['WORKSPACE', 'WHATSAPP', 'EMAIL'] as const).map(async (scope) => {
        const policy = await manager
          .getRepository(HermesBotPolicyEntity)
          .findOneBy({ workspaceId, scope });
        return {
          scope,
          mode:
            policy?.mode ?? (scope === 'WORKSPACE' ? 'ASSISTED' : 'INHERIT'),
          revision: messagingDigest([
            workspaceId,
            scope,
            policy?.mode,
            policy?.updatedAt,
          ]),
        };
      }),
    );
  }

  async workspaceBotPolicies(actor: HermesMessagingActor) {
    await this.access.assertAllowed(actor);
    const result = await this.workspaceBotPoliciesWithManager(
      actor.workspaceId,
    );
    await this.access.assertAllowed(actor);
    return result;
  }

  async setWorkspaceBotPolicy(
    actor: HermesMessagingActor,
    raw: {
      scope: HermesBotPolicyScope;
      mode: HermesBotPolicyOverrideMode;
      expectedRevision: string;
    },
  ) {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z
        .object({
          scope: z.enum(['WORKSPACE', 'WHATSAPP', 'EMAIL']),
          mode: z.enum(['INHERIT', 'AUTO', 'ASSISTED', 'OFF']),
          expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict()
        .refine(
          (input) => input.scope !== 'WORKSPACE' || input.mode !== 'INHERIT',
        ),
      raw,
    );
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const policies = await this.workspaceBotPoliciesWithManager(
        actor.workspaceId,
        manager,
      );
      if (
        policies.find((policy) => policy.scope === input.scope)?.revision !==
        input.expectedRevision
      )
        throw new ConflictException('BOT_POLICY_STALE');
      const workspaceMode = policies.find(
        (policy) => policy.scope === 'WORKSPACE',
      )!.mode;
      const rank: Record<string, number> = { OFF: 0, ASSISTED: 1, AUTO: 2 };
      if (
        input.scope !== 'WORKSPACE' &&
        input.mode !== 'INHERIT' &&
        rank[input.mode] > rank[workspaceMode]
      )
        throw new ConflictException('BOT_POLICY_RESTRICTION');
      const repository = manager.getRepository(HermesBotPolicyEntity);
      const previous = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        scope: input.scope,
      });
      const at = new Date(
        Math.max(Date.now(), (previous?.updatedAt.getTime() ?? 0) + 1),
      );
      await repository.save({
        workspaceId: actor.workspaceId,
        scope: input.scope,
        mode: input.mode,
        updatedAt: at,
        updatedByUserWorkspaceId: actor.userWorkspaceId,
      });
      // A parent edit invalidates delegations; relaxing it must never reactivate an old grant.
      const criteria =
        input.scope === 'WORKSPACE'
          ? { workspaceId: actor.workspaceId }
          : { workspaceId: actor.workspaceId, channel: input.scope };
      await manager
        .getRepository(HermesConversationEntity)
        .update(criteria, { botOwnerUserWorkspaceId: null });
      return (
        await this.workspaceBotPoliciesWithManager(actor.workspaceId, manager)
      ).find((policy) => policy.scope === input.scope)!;
    });
  }

  async setConversationBotPolicy(
    actor: HermesMessagingActor,
    raw: {
      conversationId: string;
      mode: 'INHERIT' | HermesBotPolicyMode;
      expectedRevision: string;
      delegateAuto?: boolean;
    },
  ) {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          mode: z.enum(['INHERIT', 'AUTO', 'ASSISTED', 'OFF']),
          expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
          delegateAuto: z.boolean().optional(),
        })
        .strict(),
      raw,
    );
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConversationEntity);
      const current = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        id: input.conversationId,
      });
      if (!current) throw new NotFoundException('CONVERSATION_NOT_FOUND');
      if (
        (await this.botPolicy(current, manager)).revision !==
        input.expectedRevision
      )
        throw new ConflictException('BOT_POLICY_STALE');
      const candidate = { ...current, botMode: input.mode };
      const result = await this.botPolicy(candidate, manager);
      if (input.mode !== 'INHERIT' && result.effectiveMode !== input.mode)
        throw new ConflictException('BOT_POLICY_RESTRICTION');
      if (result.effectiveMode === 'AUTO' && input.delegateAuto !== true)
        throw new ConflictException('BOT_DELEGATION_REQUIRED');
      if (
        result.effectiveMode === 'AUTO' &&
        (await manager.getRepository(HermesInboxMessageEntity).countBy({
          workspaceId: actor.workspaceId,
          conversationId: current.id,
          errorCode: 'CONTACT_HANDLE_CHANGED',
        }))
      )
        throw new ConflictException('CONVERSATION_CONTACT_REVIEW_REQUIRED');
      const at = new Date(
        Math.max(Date.now(), (current.botModeUpdatedAt?.getTime() ?? 0) + 1),
      );
      const update = {
        botMode: input.mode,
        botModeUpdatedAt: at,
        botOwnerUserWorkspaceId:
          result.effectiveMode === 'AUTO' ? actor.userWorkspaceId : null,
      };
      await repository.update(
        { workspaceId: actor.workspaceId, id: current.id },
        update,
      );
      return this.botPolicy({ ...current, ...update }, manager);
    });
  }

  async connections(actor: HermesMessagingActor) {
    await this.access.assertAllowed(actor);
    const result = await Promise.all(
      (['WHATSAPP', 'EMAIL'] as const).map(async (channel) => {
        const adapter = this.registry.get(channel);
        if (!adapter)
          return {
            channel,
            state: 'NOT_CONFIGURED',
            canSend: false,
            canSync: false,
            canSendMedia: false,
            canReceiveMedia: false,
            canRecordVoice: false,
            canComposeRichEmail: false,
            lastCheckedAt: new Date(),
            errorCode: null,
          };
        try {
          const probe = await adapter.probe(actor.workspaceId);
          const status = [
            'NOT_CONFIGURED',
            'CONFIGURED_UNVERIFIED',
            'AVAILABLE',
            'UNAVAILABLE',
          ].includes(probe.status)
            ? probe.status
            : 'UNAVAILABLE';
          return {
            channel,
            state: status,
            canSend:
              ['AVAILABLE', 'CONFIGURED_UNVERIFIED'].includes(status) &&
              (probe.canSend ?? status === 'AVAILABLE'),
            canSync:
              ['AVAILABLE', 'CONFIGURED_UNVERIFIED'].includes(status) &&
              (probe.canSync ?? false),
            canSendMedia: status === 'AVAILABLE' && probe.canSendMedia === true,
            canReceiveMedia:
              status === 'AVAILABLE' && probe.canReceiveMedia === true,
            canRecordVoice:
              status === 'AVAILABLE' && probe.canRecordVoice === true,
            canComposeRichEmail:
              status === 'AVAILABLE' && probe.canComposeRichEmail === true,
            lastCheckedAt: new Date(),
            errorCode: status === 'UNAVAILABLE' ? 'PROVIDER_UNAVAILABLE' : null,
          };
        } catch {
          return {
            channel,
            state: 'UNAVAILABLE',
            canSend: false,
            canSync: false,
            canSendMedia: false,
            canReceiveMedia: false,
            canRecordVoice: false,
            canComposeRichEmail: false,
            lastCheckedAt: new Date(),
            errorCode: 'PROVIDER_UNAVAILABLE',
          };
        }
      }),
    );
    await this.access.assertAllowed(actor);
    return result.map((connection) => ({
      ...connection,
      canSendMedia: connection.canSendMedia ?? false,
      canReceiveMedia: connection.canReceiveMedia ?? false,
      canRecordVoice: connection.canRecordVoice ?? false,
      canComposeRichEmail: connection.canComposeRichEmail ?? false,
    }));
  }

  async conversations(
    actor: HermesMessagingActor,
    input: HermesInboxConversationsInput = {},
  ) {
    await this.access.assertAllowed(actor);
    const parsed = this.parse(
      z
        .object({
          channel: z.enum(['WHATSAPP', 'EMAIL']).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.string().max(256).optional(),
        })
        .strict(),
      input,
    );
    let cursor;
    try {
      cursor = decodeMessagingCursor(parsed.cursor);
    } catch {
      throw new BadRequestException('INVALID_CURSOR');
    }
    const limit = pageLimit(parsed.limit, 30);
    const query = this.dataSource
      .getRepository(HermesConversationEntity)
      .createQueryBuilder('conversation')
      .where('conversation."workspaceId" = :workspaceId', {
        workspaceId: actor.workspaceId,
      });
    if (parsed.channel)
      query.andWhere('conversation."channel" = :channel', {
        channel: parsed.channel,
      });
    if (cursor)
      query.andWhere(
        '(conversation."lastMessageAt", conversation."id") < (:at, :id)',
        cursor,
      );
    const rows = await query
      .orderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const selected = rows.slice(0, limit);
    const items = await Promise.all(
      selected.map(async (row) => {
        const conflict = await this.dataSource
          .getRepository(HermesInboxMessageEntity)
          .countBy({
            workspaceId: actor.workspaceId,
            conversationId: row.id,
            errorCode: 'CONTACT_HANDLE_CHANGED',
          });
        return {
          ...row,
          ...(conflict
            ? { personId: null, personMatchStatus: 'AMBIGUOUS' }
            : await this.people.match(actor, row.channel, row.contactHandle)),
        };
      }),
    );
    await this.access.assertAllowed(actor);
    const last = selected[selected.length - 1];
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? encodeMessagingCursor(last.lastMessageAt, last.id)
          : null,
    };
  }

  async messages(actor: HermesMessagingActor, input: HermesInboxMessagesInput) {
    await this.access.assertAllowed(actor);
    const parsed = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).optional(),
          cursor: z.string().max(256).optional(),
        })
        .strict(),
      input,
    );
    await this.conversation(actor.workspaceId, parsed.conversationId);
    let cursor;
    try {
      cursor = decodeMessagingCursor(parsed.cursor);
    } catch {
      throw new BadRequestException('INVALID_CURSOR');
    }
    const limit = pageLimit(parsed.limit, 50);
    const query = this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .createQueryBuilder('message')
      .where(
        'message."workspaceId" = :workspaceId AND message."conversationId" = :conversationId AND message."canonicalMessageId" IS NULL',
        {
          workspaceId: actor.workspaceId,
          conversationId: parsed.conversationId,
        },
      );
    if (cursor)
      query.andWhere(
        '(message."occurredAt", message."id") < (:at, :id)',
        cursor,
      );
    const rows = await query
      .orderBy('message.occurredAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .take(limit + 1)
      .getMany();
    const items = rows.slice(0, limit);
    await this.access.assertAllowed(actor);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? encodeMessagingCursor(last.occurredAt, last.id)
          : null,
    };
  }

  async messageV3(
    actor: HermesMessagingActor,
    message: HermesInboxMessageEntity,
  ) {
    const attachments = this.media
      ? (
          await Promise.all(
            (message.attachmentIds ?? []).map((id) =>
              this.media!.attachment(
                actor.workspaceId,
                id,
                message.conversationId,
              ),
            ),
          )
        ).flat()
      : [];
    await this.access.assertAllowed(actor);
    return { ...message, kind: message.kind ?? 'TEXT', attachments };
  }
  async messagesV3(
    actor: HermesMessagingActor,
    input: HermesInboxMessagesInput,
  ) {
    const page = await this.messages(actor, input);
    return {
      ...page,
      items: await Promise.all(
        page.items.map((item) => this.messageV3(actor, item)),
      ),
    };
  }
  async replyV3(actor: HermesMessagingActor, raw: HermesInboxReplyV3Input) {
    const input = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          clientRequestId: z.string().uuid(),
          kind: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO']),
          text: z.string().max(20_000),
          assetId: z.string().uuid().optional(),
        })
        .strict(),
      raw,
    );
    if (input.kind === 'AUDIO' && input.text !== '')
      throw new BadRequestException('AUDIO_CAPTION_UNSUPPORTED');
    if ((input.kind === 'TEXT') === !!input.assetId)
      throw new BadRequestException('MESSAGE_ASSET_KIND_MISMATCH');
    const result = await this.reply(
      actor,
      {
        conversationId: input.conversationId,
        clientRequestId: input.clientRequestId,
        text: input.text,
      },
      undefined,
      input.kind === 'TEXT'
        ? undefined
        : { assetId: input.assetId!, kind: input.kind },
    );
    return this.messageV3(actor, result);
  }

  // The mail module must derive providerConnectionId from the current verified
  // mailbox configuration, never from an untrusted API input. This creates a
  // draft conversation only: no received message or delivery proof is invented.
  async ensureEmailDraftConversation(
    actor: HermesMessagingActor,
    raw: {
      clientRequestId: string;
      providerConnectionId: string;
      contactHandle: string;
      subject: string;
    },
  ) {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z
        .object({
          clientRequestId: z.string().uuid(),
          providerConnectionId: z
            .string()
            .min(1)
            .max(256)
            .regex(/^[\x21-\x7e]+$/),
          contactHandle: emailAddress,
          subject: z
            .string()
            .max(512)
            .refine((value) => !/[\r\n\0]/.test(value)),
        })
        .strict(),
      raw,
    );
    const handle = normalizeContactHandle('EMAIL', input.contactHandle);
    const adapter = this.registry.get('EMAIL');
    if (!adapter) throw new BadRequestException('MESSAGING_NOT_CONFIGURED');
    const probe = await adapter.probe(actor.workspaceId);
    if (!['AVAILABLE', 'CONFIGURED_UNVERIFIED'].includes(probe.status))
      throw new ServiceUnavailableException('MESSAGING_NOT_CONFIGURED');
    const providerConversationId = `draft:${input.clientRequestId}`;
    const id = messagingId(
      actor.workspaceId,
      'EMAIL',
      input.providerConnectionId,
      providerConversationId,
    );
    const conversation = await this.transaction(
      actor.workspaceId,
      async (manager) => {
        await this.access.assertAllowed(actor, manager);
        const repository = manager.getRepository(HermesConversationEntity);
        const existing = await repository.findOneBy({
          workspaceId: actor.workspaceId,
          id,
        });
        if (existing) {
          if (
            existing.providerConnectionId !== input.providerConnectionId ||
            existing.contactHandle !== handle ||
            existing.subject !== input.subject
          )
            throw new ConflictException('DRAFT_CONVERSATION_CONFLICT');
          return existing;
        }
        return repository.save({
          id,
          workspaceId: actor.workspaceId,
          channel: 'EMAIL',
          providerConnectionId: input.providerConnectionId,
          providerConversationId,
          contactHandle: handle,
          subject: input.subject,
          lastMessageAt: new Date(),
          botMode: 'MANUAL',
          botOwnerUserWorkspaceId: null,
          botModeUpdatedAt: null,
        });
      },
    );
    await this.access.assertAllowed(actor);
    return conversation;
  }

  // Server-only entry point for the mail module, which owns verified identity,
  // recipient planning, private HTML/provenance storage and MIME/CID handling.
  async replyEmail(actor: HermesMessagingActor, raw: HermesEmailReplyInput) {
    const input = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          clientRequestId: z.string().uuid(),
          envelope: emailEnvelopeSchema,
          attachmentIds: z
            .array(z.string().uuid())
            .max(10)
            .refine((ids) => new Set(ids).size === ids.length),
        })
        .strict(),
      raw,
    );
    if (
      input.envelope.inlineAttachments?.some(
        (inline) => !input.attachmentIds.includes(inline.assetId),
      ) ||
      new Set(input.envelope.inlineAttachments?.map((inline) => inline.cid))
        .size !== (input.envelope.inlineAttachments?.length ?? 0)
    )
      throw new BadRequestException('EMAIL_INLINE_ATTACHMENT_SCOPE_INVALID');
    const conversation = await this.conversation(
      actor.workspaceId,
      input.conversationId,
    );
    if (conversation.channel !== 'EMAIL')
      throw new BadRequestException('EMAIL_CHANNEL_REQUIRED');
    const result = await this.reply(
      actor,
      {
        conversationId: input.conversationId,
        clientRequestId: input.clientRequestId,
        text: input.envelope.text,
      },
      undefined,
      { kind: 'EMAIL', assetIds: input.attachmentIds, email: input.envelope },
    );
    return this.messageV3(actor, result);
  }

  async draftReply(
    actor: HermesMessagingActor,
    raw: { conversationId: string; messageId: string },
  ): Promise<HermesMessagingBotResult> {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          messageId: z.string().uuid(),
        })
        .strict(),
      raw,
    );
    const conversation = await this.conversation(
      actor.workspaceId,
      input.conversationId,
    );
    const policy = await this.botPolicy(conversation);
    if (policy.effectiveMode === 'OFF')
      throw new ConflictException('BOT_POLICY_OFF');
    const message = await this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .findOneBy({
        workspaceId: actor.workspaceId,
        conversationId: conversation.id,
        id: input.messageId,
        canonicalMessageId: IsNull(),
      });
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
    if (message.kind && !['TEXT', 'EMAIL'].includes(message.kind))
      throw new BadRequestException('MEDIA_MCP_ANALYSIS_UNSUPPORTED');
    const bot = this.registry.getBot();
    if (!bot)
      return {
        mode: 'MANUAL',
        status: 'NOT_CONFIGURED',
        provider: 'HERMES_MCP',
      };
    let result: HermesMessagingBotResult;
    try {
      const draft = await bot.draftReply({
        workspaceId: actor.workspaceId,
        conversationId: conversation.id,
        messageId: message.id,
        text: message.text,
        channel: conversation.channel,
      });
      result =
        draft.status === 'READY' &&
        draft.text &&
        messagingText.safeParse(draft.text).success
          ? {
              mode: 'DRAFT',
              status: 'READY',
              text: draft.text,
              provider: 'HERMES_MCP',
            }
          : {
              mode: 'MANUAL',
              status:
                draft.status === 'NOT_CONFIGURED'
                  ? 'NOT_CONFIGURED'
                  : 'UNAVAILABLE',
              provider: 'HERMES_MCP',
            };
    } catch {
      result = {
        mode: 'MANUAL',
        status: 'UNAVAILABLE',
        provider: 'HERMES_MCP',
      };
    }
    await this.access.assertAllowed(actor);
    const current = await this.botPolicy(
      await this.conversation(actor.workspaceId, conversation.id),
    );
    if (current.effectiveMode === 'OFF' || current.revision !== policy.revision)
      throw new ConflictException('BOT_POLICY_STALE');
    return result;
  }

  private async isBotAllowed(
    conversation: HermesConversationEntity,
    grant: BotGrant,
    manager: Pick<EntityManager, 'getRepository'> = this.dataSource,
  ): Promise<boolean> {
    return (
      this.isBotGrant(conversation, grant) &&
      (await this.botPolicy(conversation, manager)).effectiveMode === 'AUTO'
    );
  }

  private isBotGrant(
    conversation: HermesConversationEntity,
    grant: BotGrant,
  ): boolean {
    return (
      ['AUTO', 'INHERIT'].includes(conversation.botMode) &&
      conversation.botOwnerUserWorkspaceId === grant.ownerUserWorkspaceId &&
      conversation.botModeUpdatedAt?.toISOString() === grant.epoch
    );
  }

  async setBotMode(
    actor: HermesMessagingActor,
    raw: { conversationId: string; mode: 'MANUAL' | 'AUTO' },
  ) {
    await this.access.assertAllowed(actor);
    const input = this.parse(
      z
        .object({
          conversationId: z.string().uuid(),
          mode: z.enum(['MANUAL', 'AUTO']),
        })
        .strict(),
      raw,
    );
    const conversation = await this.conversation(
      actor.workspaceId,
      input.conversationId,
    );
    const activationPolicy = await this.botPolicy({
      ...conversation,
      botMode: 'AUTO',
    });
    if (
      conversation.botMode === 'OFF' ||
      (input.mode === 'AUTO' && activationPolicy.effectiveMode !== 'AUTO')
    )
      throw new ConflictException('BOT_POLICY_RESTRICTION');
    let mode = input.mode,
      status = mode === 'MANUAL' ? 'MANUAL' : 'ACTIVE';
    if (
      mode === 'AUTO' &&
      (await this.dataSource.getRepository(HermesInboxMessageEntity).countBy({
        workspaceId: actor.workspaceId,
        conversationId: conversation.id,
        errorCode: 'CONTACT_HANDLE_CHANGED',
      }))
    ) {
      mode = 'MANUAL';
      status = 'UNAVAILABLE';
    }
    if (mode === 'AUTO') {
      const adapter = this.registry.get(conversation.channel);
      if (!adapter) {
        mode = 'MANUAL';
        status = 'NOT_CONFIGURED';
      } else
        try {
          const probe = await adapter.probe(actor.workspaceId);
          if (
            !(
              ['AVAILABLE', 'CONFIGURED_UNVERIFIED'].includes(probe.status) &&
              (probe.canSend ?? probe.status === 'AVAILABLE')
            )
          ) {
            mode = 'MANUAL';
            status =
              probe.status === 'NOT_CONFIGURED'
                ? 'NOT_CONFIGURED'
                : 'UNAVAILABLE';
          }
        } catch {
          mode = 'MANUAL';
          status = 'UNAVAILABLE';
        }
    }
    if (mode === 'AUTO' && !this.registry.getBot()) {
      mode = 'MANUAL';
      status = 'NOT_CONFIGURED';
    }
    await this.access.assertAllowed(actor);
    return this.transaction(actor.workspaceId, async (manager) => {
      await this.access.assertAllowed(actor, manager);
      const repository = manager.getRepository(HermesConversationEntity);
      const current = await repository.findOneBy({
        workspaceId: actor.workspaceId,
        id: conversation.id,
      });
      if (!current) throw new NotFoundException('CONVERSATION_NOT_FOUND');
      if (
        input.mode === 'AUTO' &&
        (await this.botPolicy({ ...current, botMode: 'AUTO' }, manager))
          .revision !== activationPolicy.revision
      )
        throw new ConflictException('BOT_HUMAN_HANDOFF');
      if (current.botMode === 'OFF')
        throw new ConflictException('BOT_POLICY_RESTRICTION');
      if (
        input.mode === 'AUTO' &&
        (await this.botPolicy({ ...current, botMode: 'AUTO' }, manager))
          .effectiveMode !== 'AUTO'
      )
        throw new ConflictException('BOT_POLICY_RESTRICTION');
      if (
        input.mode === 'AUTO' &&
        (current.botModeUpdatedAt?.toISOString() ?? null) !==
          (conversation.botModeUpdatedAt?.toISOString() ?? null)
      )
        throw new ConflictException('BOT_HUMAN_HANDOFF');
      const at = new Date(
        Math.max(Date.now(), (current.botModeUpdatedAt?.getTime() ?? 0) + 1),
      );
      await repository.update(
        { workspaceId: actor.workspaceId, id: conversation.id },
        {
          botMode: mode,
          botOwnerUserWorkspaceId:
            mode === 'AUTO' ? actor.userWorkspaceId : null,
          botModeUpdatedAt: at,
        },
      );
      return { conversationId: conversation.id, mode, status };
    });
  }

  private async stopBot(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    grant: BotGrant,
    errorCode: string,
  ): Promise<void> {
    await this.transaction(workspaceId, async (manager) => {
      const repository = manager.getRepository(HermesConversationEntity);
      const current = await repository.findOneBy({
        workspaceId,
        id: conversationId,
      });
      if (current && this.isBotGrant(current, grant))
        await repository.update(
          { workspaceId, id: conversationId },
          {
            botMode: 'MANUAL',
            botOwnerUserWorkspaceId: null,
            botModeUpdatedAt: new Date(
              Math.max(Date.now(), new Date(grant.epoch).getTime() + 1),
            ),
          },
        );
      await manager
        .getRepository(HermesInboxMessageEntity)
        .update(
          { workspaceId, id: messageId, errorCode: IsNull() },
          { errorCode },
        );
    });
  }

  private async processAutoReply(
    workspaceId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const conversation = await this.conversation(workspaceId, conversationId);
    if (
      !['AUTO', 'INHERIT'].includes(conversation.botMode) ||
      !conversation.botOwnerUserWorkspaceId ||
      !conversation.botModeUpdatedAt
    )
      return;
    const grant = {
      ownerUserWorkspaceId: conversation.botOwnerUserWorkspaceId,
      epoch: conversation.botModeUpdatedAt.toISOString(),
    };
    const message = await this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .findOneBy({ workspaceId, conversationId, id: messageId });
    if (
      !message ||
      message.direction !== 'INBOUND' ||
      message.occurredAt.getTime() < conversation.botModeUpdatedAt.getTime()
    )
      return;
    const clientRequestId = messagingId(workspaceId, 'bot-reply', messageId);
    if (
      await this.dataSource
        .getRepository(HermesInboxMessageEntity)
        .findOneBy({ workspaceId, clientRequestId })
    )
      return;
    if (!(await this.isBotAllowed(conversation, grant))) return;
    const membership = await this.dataSource
      .getRepository(UserWorkspaceEntity)
      .findOneBy({
        id: grant.ownerUserWorkspaceId,
        workspaceId,
        deletedAt: IsNull(),
      });
    if (!membership || message.errorCode === 'CONTACT_HANDLE_CHANGED') {
      await this.stopBot(
        workspaceId,
        conversationId,
        messageId,
        grant,
        'BOT_OPERATOR_OR_CONTACT_UNAVAILABLE',
      );
      return;
    }
    const actor = {
      workspaceId,
      userId: membership.userId,
      userWorkspaceId: membership.id,
    };
    try {
      await this.access.assertAllowed(actor);
      const draft = await this.draftReply(actor, { conversationId, messageId });
      if (draft.status !== 'READY' || !draft.text) {
        await this.stopBot(
          workspaceId,
          conversationId,
          messageId,
          grant,
          draft.status === 'NOT_CONFIGURED'
            ? 'BOT_NOT_CONFIGURED'
            : 'BOT_UNAVAILABLE',
        );
        return;
      }
      if (
        !(await this.isBotAllowed(
          await this.conversation(workspaceId, conversationId),
          grant,
        ))
      )
        return;
      if (
        await this.dataSource
          .getRepository(HermesInboxMessageEntity)
          .findOneBy({ workspaceId, clientRequestId })
      )
        return;
      await this.reply(
        actor,
        { conversationId, clientRequestId, text: draft.text },
        grant,
      );
    } catch (error) {
      if (
        await this.dataSource
          .getRepository(HermesInboxMessageEntity)
          .findOneBy({ workspaceId, clientRequestId })
      )
        return;
      await this.stopBot(
        workspaceId,
        conversationId,
        messageId,
        grant,
        error instanceof ConflictException &&
          error.message === 'BOT_HUMAN_HANDOFF'
          ? 'BOT_HUMAN_HANDOFF'
          : error instanceof ConflictException &&
              error.message === 'CONVERSATION_CONTACT_REVIEW_REQUIRED'
            ? 'BOT_CONTACT_REVIEW_REQUIRED'
            : 'BOT_UNAVAILABLE',
      );
    }
  }

  // Called only by server-authenticated provider adapters; no public GraphQL ingest mutation exists.
  async ingest(
    raw: HermesMessagingEvent,
    options: { suppressAutomation?: boolean; observedOnly?: boolean } = {},
  ): Promise<{ conversationId: string; messageId: string; replay: boolean }> {
    const event = this.parse(messagingEventSchema, raw);
    let handle: string;
    try {
      handle = normalizeContactHandle(event.channel, event.contactHandle);
    } catch {
      throw new BadRequestException('INVALID_CONTACT_HANDLE');
    }
    const conversationId = messagingId(
      event.workspaceId,
      event.channel,
      event.providerConnectionId,
      event.providerConversationId,
    );
    const messageId = messagingId(
      event.workspaceId,
      event.channel,
      event.providerConnectionId,
      'provider',
      event.providerMessageId,
    );
    const attachmentIds =
      event.attachmentIds ?? (event.mediaAssetId ? [event.mediaAssetId] : []);
    if (new Set(attachmentIds).size !== attachmentIds.length)
      throw new BadRequestException('DUPLICATE_MEDIA_ASSET');
    const mediaDigests = this.media
      ? await Promise.all(
          attachmentIds.map((assetId) =>
            this.media!.digest(
              event.workspaceId,
              assetId,
              conversationId,
              event.providerConnectionId,
            ),
          ),
        )
      : [];
    if (
      attachmentIds.length !== mediaDigests.length ||
      (event.kind && event.kind !== 'EMAIL' && !attachmentIds.length)
    )
      throw new BadRequestException('MEDIA_ASSET_NOT_FOUND');
    const digest = messagingDigest([
      conversationId,
      event.direction,
      handle,
      event.text,
      // The provider may transcode outbound audio before echoing it.
      ...(event.kind
        ? [event.kind, ...(event.direction === 'INBOUND' ? mediaDigests : [])]
        : []),
    ]);
    const result = await this.transaction(
      event.workspaceId,
      async (manager) => {
        const workspace = await manager
          .getRepository(WorkspaceEntity)
          .findOneBy({
            id: event.workspaceId,
            deletedAt: IsNull(),
            activationStatus: WorkspaceActivationStatus.ACTIVE,
          });
        if (!workspace)
          throw new NotFoundException('MESSAGING_WORKSPACE_UNAVAILABLE');
        const messages = manager.getRepository(HermesInboxMessageEntity);
        const existing = await messages.findOneBy({
          workspaceId: event.workspaceId,
          id: messageId,
        });
        if (existing) {
          if (
            existing.contentDigest !== digest ||
            existing.conversationId !== conversationId
          )
            throw new ConflictException('PROVIDER_EVENT_CONFLICT');
          if (
            !options.observedOnly &&
            event.direction === 'OUTBOUND' &&
            existing.status === 'OBSERVED'
          )
            await messages.update(
              {
                workspaceId: event.workspaceId,
                id: messageId,
                status: 'OBSERVED',
              },
              { status: 'ACCEPTED' },
            );
          return { conversationId, messageId, replay: true };
        }
        const conversations = manager.getRepository(HermesConversationEntity);
        const conversation = await conversations.findOneBy({
          workspaceId: event.workspaceId,
          id: conversationId,
        });
        const contactChanged =
          !!conversation && conversation.contactHandle !== handle;
        const at = new Date(event.occurredAt);
        if (!conversation)
          await conversations.save({
            id: conversationId,
            workspaceId: event.workspaceId,
            channel: event.channel,
            providerConnectionId: event.providerConnectionId,
            providerConversationId: event.providerConversationId,
            contactHandle: handle,
            subject: event.subject ?? null,
            lastMessageAt: at,
            botMode: 'INHERIT',
            botOwnerUserWorkspaceId: null,
            botModeUpdatedAt: null,
          });
        else if (at.getTime() > conversation.lastMessageAt.getTime())
          await conversations.update(
            { workspaceId: event.workspaceId, id: conversationId },
            { lastMessageAt: at },
          );
        await messages.save({
          id: messageId,
          workspaceId: event.workspaceId,
          conversationId,
          channel: event.channel,
          providerConnectionId: event.providerConnectionId,
          providerMessageId: event.providerMessageId,
          providerMetadata: event.providerMetadata ?? null,
          clientRequestId: null,
          direction: event.direction,
          status: options.observedOnly
            ? 'OBSERVED'
            : event.direction === 'INBOUND'
              ? 'RECEIVED'
              : 'ACCEPTED',
          text: event.text,
          kind: event.kind ?? 'TEXT',
          attachmentIds,
          contentDigest: digest,
          occurredAt: at,
          errorCode: contactChanged ? 'CONTACT_HANDLE_CHANGED' : null,
          canonicalMessageId: null,
        });
        return { conversationId, messageId, replay: false };
      },
    );
    if (
      !options.suppressAutomation &&
      !options.observedOnly &&
      event.direction === 'INBOUND' &&
      (!event.kind || (event.kind === 'EMAIL' && event.text.trim()))
    )
      await this.processAutoReply(
        event.workspaceId,
        result.conversationId,
        result.messageId,
      );
    return result;
  }

  async reply(
    actor: HermesMessagingActor,
    raw: HermesInboxReplyInput,
    botGrant?: BotGrant,
    mediaInput?: {
      assetId?: string;
      assetIds?: string[];
      kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'EMAIL';
      email?: HermesEmailEnvelope;
    },
  ): Promise<HermesInboxMessageEntity> {
    await this.access.assertAllowed(actor);
    const input = mediaInput
      ? this.parse(
          z
            .object({
              conversationId: z.string().uuid(),
              clientRequestId: z.string().uuid(),
              text: z
                .string()
                .max(mediaInput.kind === 'EMAIL' ? 20000 : 4096)
                .refine((v) => !v.includes('\0')),
            })
            .strict(),
          raw,
        )
      : this.parse(replySchema, raw);
    const assetIds = mediaInput
      ? (mediaInput.assetIds ??
        (mediaInput.assetId ? [mediaInput.assetId] : []))
      : [];
    if (mediaInput && (!this.media || botGrant))
      throw new BadRequestException('MEDIA_AUTOMATION_UNSUPPORTED');
    const conversation = await this.conversation(
      actor.workspaceId,
      input.conversationId,
    );
    if (botGrant && !(await this.isBotAllowed(conversation, botGrant)))
      throw new ConflictException('BOT_HUMAN_HANDOFF');
    const contactConflict = await this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .countBy({
        workspaceId: actor.workspaceId,
        conversationId: conversation.id,
        errorCode: 'CONTACT_HANDLE_CHANGED',
      });
    if (contactConflict)
      throw new ConflictException('CONVERSATION_CONTACT_REVIEW_REQUIRED');
    const digest = messagingDigest([
      conversation.id,
      input.text,
      ...(mediaInput
        ? [mediaInput.kind, assetIds, mediaInput.email ?? null]
        : []),
    ]);
    const id = messagingId(actor.workspaceId, 'request', input.clientRequestId);
    const previous = await this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .findOneBy({ workspaceId: actor.workspaceId, id });
    if (previous) {
      if (previous.contentDigest !== digest)
        throw new ConflictException('CLIENT_REQUEST_CONFLICT');
      const result = await this.visibleMessage(actor.workspaceId, previous);
      await this.access.assertAllowed(actor);
      return result;
    }
    const adapter = this.registry.get(conversation.channel);
    if (!adapter) throw new BadRequestException('MESSAGING_NOT_CONFIGURED');
    let probe;
    try {
      probe = await adapter.probe(actor.workspaceId);
    } catch {
      throw new ServiceUnavailableException('MESSAGING_PROVIDER_UNAVAILABLE');
    }
    if (
      !(
        ['AVAILABLE', 'CONFIGURED_UNVERIFIED'].includes(probe.status) &&
        (probe.canSend ?? probe.status === 'AVAILABLE')
      )
    )
      throw new ServiceUnavailableException(
        probe.status === 'NOT_CONFIGURED'
          ? 'MESSAGING_NOT_CONFIGURED'
          : 'MESSAGING_PROVIDER_UNAVAILABLE',
      );
    if (
      mediaInput &&
      (mediaInput.kind === 'EMAIL'
        ? !probe.canComposeRichEmail
        : !probe.canSendMedia)
    )
      throw new ServiceUnavailableException('MEDIA_PROVIDER_NOT_VERIFIED');
    // Authorization repositories use a separate pool connection; do not hold a serialized transaction while waiting for them.
    await this.access.assertAllowed(actor);
    const reservation = await this.transaction(
      actor.workspaceId,
      async (manager) => {
        if (botGrant) {
          const current = await manager
            .getRepository(HermesConversationEntity)
            .findOneBy({ workspaceId: actor.workspaceId, id: conversation.id });
          if (
            !current ||
            !(await this.isBotAllowed(current, botGrant, manager))
          )
            throw new ConflictException('BOT_HUMAN_HANDOFF');
        }
        const repository = manager.getRepository(HermesInboxMessageEntity);
        const existing = await repository.findOneBy({
          workspaceId: actor.workspaceId,
          id,
        });
        if (existing) {
          if (existing.contentDigest !== digest)
            throw new ConflictException('CLIENT_REQUEST_CONFLICT');
          return { message: existing, send: false };
        }
        if (mediaInput) {
          let totalSize = 0;
          for (const assetId of assetIds) {
            const asset = await this.media!.bind(
              actor,
              { conversationId: conversation.id, assetId },
              id,
              manager,
            );
            if (mediaInput.kind !== 'EMAIL' && asset.kind !== mediaInput.kind)
              throw new BadRequestException('MEDIA_KIND_MISMATCH');
            totalSize += asset.size;
          }
          if (totalSize > 25 * 1024 * 1024)
            throw new BadRequestException('MEDIA_TOTAL_SIZE_EXCEEDED');
        }
        // Commit a durable uncertain handoff BEFORE network I/O. A crash cannot authorize another send.
        const message = await repository.save({
          id,
          workspaceId: actor.workspaceId,
          conversationId: conversation.id,
          channel: conversation.channel,
          providerConnectionId: conversation.providerConnectionId,
          providerMessageId: null,
          clientRequestId: input.clientRequestId,
          direction: 'OUTBOUND',
          status: 'UNCONFIRMED',
          text: input.text,
          kind: mediaInput?.kind ?? 'TEXT',
          attachmentIds: assetIds,
          contentDigest: digest,
          occurredAt: new Date(),
          errorCode: 'DELIVERY_UNCERTAIN',
          canonicalMessageId: null,
        });
        const currentConversation = await manager
          .getRepository(HermesConversationEntity)
          .findOneBy({ workspaceId: actor.workspaceId, id: conversation.id });
        if (
          currentConversation &&
          message.occurredAt.getTime() >
            currentConversation.lastMessageAt.getTime()
        ) {
          await manager
            .getRepository(HermesConversationEntity)
            .update(
              { workspaceId: actor.workspaceId, id: conversation.id },
              { lastMessageAt: message.occurredAt },
            );
        }
        return { message, send: true };
      },
    );
    if (!reservation.send) {
      const result = await this.visibleMessage(
        actor.workspaceId,
        reservation.message,
      );
      await this.access.assertAllowed(actor);
      return result;
    }
    try {
      await this.access.assertAllowed(actor);
      if (
        botGrant &&
        !(await this.isBotAllowed(
          await this.conversation(actor.workspaceId, conversation.id),
          botGrant,
        ))
      )
        throw new ConflictException('BOT_HUMAN_HANDOFF');
    } catch (error) {
      await this.dataSource.getRepository(HermesInboxMessageEntity).update(
        { id, workspaceId: actor.workspaceId },
        {
          status: 'FAILED',
          errorCode: botGrant
            ? 'BOT_HANDOFF_OR_ACCESS_REVOKED'
            : 'ACCESS_REVOKED',
        },
      );
      throw error;
    }
    let receipt;
    try {
      const attachments = mediaInput
        ? await Promise.all(
            assetIds.map(async (assetId) => ({
              assetId,
              ...(await this.media!.bytes(actor, {
                conversationId: conversation.id,
                assetId,
              })),
            })),
          )
        : [];
      const attachment =
        mediaInput?.kind !== 'EMAIL' ? attachments[0] : undefined;
      await this.access.assertAllowed(actor);
      receipt = receiptSchema.parse(
        await adapter.send({
          workspaceId: actor.workspaceId,
          conversationId: conversation.id,
          providerConnectionId: conversation.providerConnectionId,
          contactHandle: conversation.contactHandle,
          text: input.text,
          clientRequestId: input.clientRequestId,
          ...(mediaInput?.email
            ? {
                email: mediaInput.email,
                attachments: attachments.map(({ assetId, asset, bytes }) => ({
                  assetId,
                  kind: asset.kind,
                  mimeType: asset.mimeType,
                  filename: asset.filename,
                  bytes,
                })),
              }
            : {}),
          ...(attachment
            ? {
                media: {
                  kind: mediaInput!.kind as 'IMAGE' | 'VIDEO' | 'AUDIO',
                  mimeType: attachment.asset.mimeType,
                  filename: attachment.asset.filename,
                  bytes: attachment.bytes,
                },
              }
            : {}),
        }),
      );
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : '';
      const definitelyNotSent = [
        'NOT_CONFIGURED',
        'INVALID_RECIPIENT',
        'SEND_REJECTED',
      ].includes(code);
      await this.dataSource.getRepository(HermesInboxMessageEntity).update(
        { id, workspaceId: actor.workspaceId },
        {
          status: definitelyNotSent ? 'FAILED' : 'UNCONFIRMED',
          errorCode: definitelyNotSent ? code : 'DELIVERY_UNCERTAIN',
        },
      );
      await this.access.assertAllowed(actor);
      return this.dataSource
        .getRepository(HermesInboxMessageEntity)
        .findOneByOrFail({ workspaceId: actor.workspaceId, id });
    }
    // An echo received before the HTTP acknowledgement uses this same provider identity.
    const canonical = await this.ingest({
      workspaceId: actor.workspaceId,
      channel: conversation.channel,
      direction: 'OUTBOUND',
      providerConnectionId: conversation.providerConnectionId,
      providerMessageId: receipt.providerMessageId,
      providerConversationId: conversation.providerConversationId,
      contactHandle: conversation.contactHandle,
      text: input.text,
      occurredAt: receipt.acceptedAt,
      ...(mediaInput
        ? {
            kind: mediaInput.kind,
            attachmentIds: assetIds,
            ...(mediaInput.assetId ? { mediaAssetId: mediaInput.assetId } : {}),
          }
        : {}),
      ...(conversation.subject ? { subject: conversation.subject } : {}),
    });
    await this.dataSource.getRepository(HermesInboxMessageEntity).update(
      { id, workspaceId: actor.workspaceId },
      {
        status: 'ACCEPTED',
        errorCode: null,
        canonicalMessageId: canonical.messageId,
      },
    );
    await this.access.assertAllowed(actor);
    return this.dataSource
      .getRepository(HermesInboxMessageEntity)
      .findOneByOrFail({
        workspaceId: actor.workspaceId,
        id: canonical.messageId,
      });
  }
}
