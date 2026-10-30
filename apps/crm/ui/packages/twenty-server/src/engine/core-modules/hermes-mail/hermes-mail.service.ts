import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { type EntityManager, IsNull, Raw, Repository } from 'typeorm';

import PostalMime, { type Email } from 'postal-mime';
import { getSendableEmailHandles } from 'kovaa-lab-shared/utils';
import { type HermesMediaService } from 'src/engine/core-modules/hermes-media/hermes-media.service';
import { messagingId } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';
import { EmailConnectionSecurity } from 'src/engine/core-modules/imap-smtp-caldav-connection/enums/email-connection-security.enum';
import { HermesMailCursorEntity } from 'src/engine/core-modules/hermes-mail/hermes-mail-cursor.entity';
import {
  mailAddress,
  mailMessageId,
  mailProviderId,
  parseHermesMail,
  readHermesMailBindings,
  type HermesMailBinding,
} from 'src/engine/core-modules/hermes-mail/hermes-mail.policy';
import { HermesConversationEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-conversation.entity';
import { HermesInboxMessageEntity } from 'src/engine/core-modules/hermes-messaging/entities/hermes-inbox-message.entity';
import { HermesMessagingAdapterRegistry } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-adapter.registry';
import { HermesMessagingService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.service';
import {
  type HermesMessagingActor,
  type HermesMessagingAdapter,
  type HermesMessagingProbe,
  type HermesMessagingReceipt,
  type HermesMessagingSend,
} from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';
import { sanitizeMailHtml } from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.policy';
import { getConnectedAccountSendableHandleOrThrow } from 'src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util';
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

const MAX_MIME_BYTES = 36 * 1024 * 1024;
const MAX_BATCH = 50;
const unavailable = () =>
  new ServiceUnavailableException('MAIL_CONNECTION_UNAVAILABLE');
const secure = (value: unknown) =>
  value === EmailConnectionSecurity.SSL_TLS ||
  value === EmailConnectionSecurity.STARTTLS;

type HermesMailConnectionsReader = {
  resolve(
    workspaceId: string,
    kind: 'MAIL',
    manager?: EntityManager,
  ): Promise<null | {
    connectionId: string;
    revision: string;
    userId: string;
    userWorkspaceId: string;
    settings: { connectedAccountId: string; mailbox: string; handle: string };
    secrets: Record<string, never>;
  }>;
  workspaceIds(kind: 'MAIL'): Promise<string[]>;
};

export type HermesMailSyncResult = {
  state: 'SYNCED' | 'PARTIAL' | 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'BUSY';
  received: number;
  replayed: number;
  skipped: number;
  moreAvailable: boolean;
};
const emptyResult = (
  state: HermesMailSyncResult['state'],
): HermesMailSyncResult => ({
  state,
  received: 0,
  replayed: 0,
  skipped: 0,
  moreAvailable: false,
});

@Injectable()
export class HermesMailService implements HermesMessagingAdapter, OnModuleInit {
  readonly channel = 'EMAIL' as const;
  private polling = false;

  constructor(
    private readonly config: KovaaLabCRMConfigService,
    @InjectRepository(ConnectedAccountEntity)
    private readonly accounts: Repository<ConnectedAccountEntity>,
    @InjectRepository(UserWorkspaceEntity)
    private readonly memberships: Repository<UserWorkspaceEntity>,
    @InjectRepository(HermesMailCursorEntity)
    private readonly cursors: Repository<HermesMailCursorEntity>,
    @InjectRepository(HermesConversationEntity)
    private readonly conversations: Repository<HermesConversationEntity>,
    @InjectRepository(HermesInboxMessageEntity)
    private readonly messages: Repository<HermesInboxMessageEntity>,
    private readonly access: HermesProspectionAccessService,
    private readonly imap: ImapClientProvider,
    private readonly smtp: SmtpClientProvider,
    private readonly inbox: HermesMessagingService,
    private readonly registry: HermesMessagingAdapterRegistry,
    private readonly redis: RedisClientService,
    @Optional()
    @Inject('HERMES_MEDIA_SERVICE')
    private readonly media?: HermesMediaService,
    @Optional()
    @Inject('HERMES_CONNECTIONS_SERVICE')
    private readonly connections?: HermesMailConnectionsReader,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  private bindings() {
    return readHermesMailBindings(this.config.get('HERMES_MAIL_CONNECTIONS'));
  }

  async connection(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<{
    binding: HermesMailBinding;
    account: ConnectedAccountEntity;
    actor: HermesMessagingActor;
    revision: string;
  } | null> {
    const record = this.connections
      ? await this.connections.resolve(workspaceId, 'MAIL', manager)
      : undefined;
    if (this.connections && !record) return null;
    const binding = record
      ? {
          connectionId: record.connectionId,
          connectedAccountId: record.settings.connectedAccountId,
          userWorkspaceId: record.userWorkspaceId,
          mailbox: record.settings.mailbox,
        }
      : this.bindings().get(workspaceId);
    if (!binding) return null;
    const revision = record ? String(record.revision) : JSON.stringify(binding);
    const account = await (
      manager?.getRepository(ConnectedAccountEntity) ?? this.accounts
    ).findOne({
      where: {
        id: binding.connectedAccountId,
        workspaceId,
        userWorkspaceId: binding.userWorkspaceId,
        archivedAt: IsNull(),
      },
    });
    if (
      !account ||
      account.provider !== ConnectedAccountProvider.IMAP_SMTP_CALDAV ||
      !mailAddress(account.handle) ||
      (record &&
        mailAddress(record.settings.handle) !== mailAddress(account.handle)) ||
      !account.connectionParameters?.IMAP ||
      !secure(account.connectionParameters.IMAP.connectionSecurity) ||
      account.authFailedAt
    )
      throw unavailable();
    const member = await (
      manager?.getRepository(UserWorkspaceEntity) ?? this.memberships
    ).findOne({
      where: { id: binding.userWorkspaceId, workspaceId, deletedAt: IsNull() },
    });
    if (!member) throw unavailable();
    // Delegation is explicit in server configuration, and revocation is live.
    await this.access.assertAllowed(
      {
        workspaceId,
        userWorkspaceId: member.id,
        userId: member.userId,
      },
      manager,
    );
    return {
      binding,
      account,
      revision,
      actor: { workspaceId, userWorkspaceId: member.id, userId: member.userId },
    };
  }

  async probe(workspaceId: string): Promise<HermesMessagingProbe> {
    try {
      const item = await this.connection(workspaceId);
      if (!item)
        return { status: 'NOT_CONFIGURED', canSend: false, canSync: false };
      const cursor = await this.cursors.findOneBy({
        workspaceId,
        connectionId: item.binding.connectionId,
        mailbox: item.binding.mailbox,
      });
      const verifiedAt = cursor?.updatedAt?.getTime() ?? 0;
      const credentialsAt = item.account.updatedAt?.getTime() ?? 0;
      const verified =
        verifiedAt >= credentialsAt &&
        verifiedAt > Date.now() - 600000 &&
        verifiedAt <= Date.now() + 1000;
      return {
        status: verified ? 'AVAILABLE' : 'CONFIGURED_UNVERIFIED',
        canSync: true,
        canComposeRichEmail:
          verified &&
          secure(item.account.connectionParameters?.SMTP?.connectionSecurity),
        canSend: secure(
          item.account.connectionParameters?.SMTP?.connectionSecurity,
        ),
      };
    } catch {
      return {
        status: 'UNAVAILABLE',
        canSend: false,
        canSync: false,
        errorCode: 'MAIL_CONNECTION_UNAVAILABLE',
      };
    }
  }

  async sync(actor: HermesMessagingActor): Promise<HermesMailSyncResult> {
    await this.access.assertAllowed(actor);
    return this.syncWorkspace(actor.workspaceId);
  }

  // Read-only IMAP polling; all writes go through the tenant inbox ledger.
  private async syncWorkspace(
    workspaceId: string,
  ): Promise<HermesMailSyncResult> {
    let expired = false;
    let close = () => {};
    const assertLive = () => {
      if (expired) throw unavailable();
    };
    const work = this.performSync(workspaceId, assertLive, (callback) => {
      close = callback;
      if (expired) close();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        expired = true;
        close();
        reject(unavailable());
      }, 45000);
    });
    try {
      return await Promise.race([work, deadline]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async performSync(
    workspaceId: string,
    assertLive: () => void,
    registerClose: (callback: () => void) => void,
  ): Promise<HermesMailSyncResult> {
    const item = await this.connection(workspaceId);
    assertLive();
    if (!item) return emptyResult('NOT_CONFIGURED');
    const { binding, account } = item;
    const redis = this.redis.getClient();
    const lockKey =
      String(this.config.get('REDIS_CACHE_PREFIX') ?? '') +
      ':hermes-mail:' +
      workspaceId +
      ':' +
      binding.connectionId;
    const lockToken = randomUUID();
    if ((await redis.set(lockKey, lockToken, 'PX', 120000, 'NX')) !== 'OK')
      return emptyResult('BUSY');
    let client:
      | Awaited<ReturnType<ImapClientProvider['getClient']>>
      | undefined;
    let lock:
      | Awaited<ReturnType<NonNullable<typeof client>['getMailboxLock']>>
      | undefined;
    try {
      client = await this.imap.getClient(account.id);
      registerClose(() => client?.close());
      assertLive();
      lock = await client.getMailboxLock(binding.mailbox, {
        readOnly: true,
        acquireTimeout: 10000,
      });
      if (!client.mailbox) throw unavailable();
      const validity = String(client.mailbox.uidValidity);
      const previous = await this.cursors.findOneBy({
        workspaceId,
        connectionId: binding.connectionId,
        mailbox: binding.mailbox,
      });
      const lastUid =
        previous?.uidValidity === validity ? Number(previous.lastUid) : 0;
      if (!Number.isSafeInteger(lastUid) || lastUid < 0) throw unavailable();
      // A verified connection updates freshness without advancing the durable UID.
      assertLive();
      await this.cursors.save({
        workspaceId,
        connectionId: binding.connectionId,
        mailbox: binding.mailbox,
        uidValidity: validity,
        lastUid: String(lastUid),
      });
      const found = await client.search(
        lastUid ? { uid: String(lastUid + 1) + ':*' } : { all: true },
        { uid: true },
      );
      const all = (Array.isArray(found) ? found : [])
        .filter((uid) => Number.isSafeInteger(uid) && uid > lastUid)
        .sort((a, b) => a - b);
      // The first synchronization imports the latest 50; later polls drain the
      // durable UID cursor oldest-first, without a sliding-window loss.
      const selected = lastUid
        ? all.slice(0, MAX_BATCH)
        : all.slice(-MAX_BATCH);
      const result = emptyResult('SYNCED');
      if (!lastUid && all.length > selected.length) {
        result.state = 'PARTIAL';
        result.skipped = all.length - selected.length;
      }
      result.moreAvailable = lastUid > 0 && all.length > selected.length;
      if (!selected.length) return result;
      const summaries = await client.fetchAll(
        selected.join(','),
        { uid: true, envelope: true, size: true, internalDate: true },
        { uid: true },
      );
      for (const entry of summaries.sort((a, b) => a.uid - b.uid)) {
        assertLive();
        if ((entry.size ?? MAX_MIME_BYTES + 1) > MAX_MIME_BYTES) {
          result.skipped++;
          continue;
        }
        const body = await client.fetchOne(
          String(entry.uid),
          {
            uid: true,
            source: { maxLength: MAX_MIME_BYTES },
            internalDate: true,
          },
          { uid: true },
        );
        const source = body && body.source;
        if (
          !source ||
          source.length > MAX_MIME_BYTES ||
          source.length !== entry.size
        ) {
          result.skipped++;
          continue;
        }
        let event;
        try {
          event = await parseHermesMail({
            source,
            workspaceId,
            connectionId: binding.connectionId,
            mailbox: binding.mailbox,
            uid: entry.uid,
            uidValidity: validity,
            internalDate: entry.internalDate,
            ownAddress: account.handle,
            ownAddresses: getSendableEmailHandles(account),
          });
        } catch {
          result.skipped++;
          continue;
        }
        if (!event) {
          result.skipped++;
          continue;
        }
        assertLive();
        const rfcId = event.providerMetadata?.rfcMessageId;
        const mimeSha256 = event.providerMetadata?.mimeSha256;
        const knownPhysical = await this.messages.findOne({
          where: {
            workspaceId,
            channel: 'EMAIL',
            providerConnectionId: binding.connectionId,
            providerMessageId: event.providerMessageId,
          },
          relations: { conversation: true },
        });
        if (
          knownPhysical?.id &&
          knownPhysical.providerMessageId === event.providerMessageId
        ) {
          result.replayed++;
          continue;
        }
        const duplicate = mimeSha256
          ? await this.messages.findOne({
              where: {
                workspaceId,
                channel: 'EMAIL',
                providerConnectionId: binding.connectionId,
                providerMetadata: Raw(
                  (alias) => alias + " ->> 'mimeSha256' = :mailMimeSha256",
                  { mailMimeSha256: mimeSha256 },
                ),
              },
              relations: { conversation: true },
            })
          : null;
        if (
          mimeSha256 &&
          duplicate?.providerMetadata?.mimeSha256 === mimeSha256
        ) {
          result.replayed++;
          continue;
        }
        // A reused RFC id without an exact native byte proof is observed, never
        // guessed to be a new delivery eligible for automation.
        const ambiguous = rfcId
          ? await this.messages.findOne({
              where: {
                workspaceId,
                channel: 'EMAIL',
                providerConnectionId: binding.connectionId,
                providerMetadata: Raw(
                  (alias) => alias + " ->> 'rfcMessageId' = :mailRfcId",
                  { mailRfcId: rfcId },
                ),
              },
              relations: { conversation: true },
            })
          : null;
        const saved = await this.observe(
          item.actor,
          {
            folder: binding.mailbox,
            uid: String(entry.uid),
            uidValidity: validity,
            internalDate: entry.internalDate,
          },
          await PostalMime.parse(source),
          !lastUid ||
            (ambiguous?.providerMetadata?.rfcMessageId === rfcId && !!rfcId),
          assertLive,
          mimeSha256,
        );
        if (saved.replay) result.replayed++;
        else result.received++;
      }
      assertLive();
      await this.cursors.save({
        workspaceId,
        connectionId: binding.connectionId,
        mailbox: binding.mailbox,
        uidValidity: validity,
        lastUid: String(Math.max(...selected)),
      });
      if (result.skipped) result.state = 'PARTIAL';
      return result;
    } finally {
      lock?.release();
      if (client) await this.imap.closeClient(client);
      await redis.eval(
        'if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end',
        1,
        lockKey,
        lockToken,
      );
    }
  }

  async observe(
    actor: HermesMessagingActor,
    scope: {
      folder: string;
      uid: string;
      uidValidity: string;
      internalDate?: Date | string;
    },
    parsed: Email,
    suppressAutomation = true,
    assertDeadline: () => void = () => {},
    mimeSha256?: string,
  ) {
    assertDeadline();
    await this.access.assertAllowed(actor);
    const item = await this.connection(actor.workspaceId);
    if (!item) throw unavailable();
    const assertLive = async (manager?: EntityManager) => {
      assertDeadline();
      await this.access.assertAllowed(actor, manager);
      const fresh = await this.connection(actor.workspaceId, manager);
      if (
        !fresh ||
        fresh.binding.connectionId !== item.binding.connectionId ||
        fresh.account.id !== item.account.id ||
        fresh.revision !== item.revision ||
        fresh.account.updatedAt?.getTime() !== item.account.updatedAt?.getTime()
      )
        throw new ServiceUnavailableException('MAIL_CONNECTION_CHANGED');
      assertDeadline();
    };
    await assertLive();
    const event = await parseHermesMail({
      source: Buffer.alloc(0),
      parsed,
      mimeSha256,
      workspaceId: actor.workspaceId,
      connectionId: item.binding.connectionId,
      mailbox: scope.folder,
      uid: Number(scope.uid),
      uidValidity: scope.uidValidity,
      internalDate: scope.internalDate,
      ownAddress: item.account.handle,
      ownAddresses: getSendableEmailHandles(item.account),
    });
    if (!event) throw unavailable();
    const own = new Set(getSendableEmailHandles(item.account).map(mailAddress));
    if (own.has(mailAddress(parsed.from?.address))) {
      const external = [...(parsed.to ?? []), ...(parsed.cc ?? [])]
        .flatMap((address) => address.group ?? [address])
        .map((address) => mailAddress(address.address))
        .find((address) => address && !own.has(address));
      if (!external) throw unavailable();
      event.contactHandle = external;
      event.direction = 'OUTBOUND';
    }
    if (mimeSha256) {
      const known = await this.messages.findOne({
        where: {
          workspaceId: actor.workspaceId,
          channel: 'EMAIL',
          providerConnectionId: item.binding.connectionId,
          providerMetadata: Raw(
            (alias) => alias + " ->> 'mimeSha256' = :mailMimeSha256",
            { mailMimeSha256: mimeSha256 },
          ),
        },
        relations: { conversation: true },
      });
      if (
        known?.providerMetadata?.mimeSha256 === mimeSha256 &&
        known.providerMessageId &&
        known.conversation
      ) {
        event.providerMessageId = known.providerMessageId;
        event.providerConversationId =
          known.conversation.providerConversationId;
        event.contactHandle = known.conversation.contactHandle;
        event.direction = known.direction;
      }
    }
    const conversationId = messagingId(
      actor.workspaceId,
      'EMAIL',
      item.binding.connectionId,
      event.providerConversationId,
    );
    const attachments = [];
    let total = 0;
    for (const [index, attachment] of parsed.attachments.entries()) {
      const content =
        typeof attachment.content === 'string'
          ? Buffer.from(
              attachment.content,
              attachment.encoding === 'base64' ? 'base64' : 'utf8',
            )
          : Buffer.from(
              attachment.content instanceof Uint8Array
                ? attachment.content
                : new Uint8Array(attachment.content),
            );
      const kind = attachment.mimeType.startsWith('image/') ? 'IMAGE' : 'FILE';
      if (
        !this.media ||
        index >= 10 ||
        total + content.length > 25 * 1024 * 1024
      ) {
        attachments.push({
          index,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          state: 'UNSUPPORTED',
        });
        continue;
      }
      try {
        await assertLive();
        const asset = await this.media.receive(
          {
            workspaceId: actor.workspaceId,
            conversationId,
            providerConnectionId: item.binding.connectionId,
            providerMessageId: event.providerMessageId + ':part:' + index,
            kind,
            mimeType: attachment.mimeType,
            bytes: content,
            filename: attachment.filename ?? 'attachment',
          },
          { assertLive },
        );
        await assertLive();
        total += content.length;
        attachments.push({
          index,
          assetId: asset.assetId,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          contentId: attachment.contentId ?? null,
          state: 'READY',
        });
      } catch (error) {
        if (!(error instanceof BadRequestException)) throw error;
        attachments.push({
          index,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          state: 'UNSUPPORTED',
        });
      }
    }
    await assertLive();
    const saved = await this.inbox.ingest(
      {
        ...event,
        kind: 'EMAIL',
        attachmentIds: attachments.flatMap((attachment) =>
          attachment.assetId ? [attachment.assetId] : [],
        ),
      },
      {
        suppressAutomation:
          suppressAutomation || event.direction === 'OUTBOUND',
        observedOnly: suppressAutomation || event.direction === 'OUTBOUND',
        assertLive,
      },
    );
    return {
      ...saved,
      contactHandle: event.contactHandle,
      direction: event.direction,
      attachments,
      providerConnectionId: item.binding.connectionId,
    };
  }

  async draftConversation(
    actor: HermesMessagingActor,
    input: { clientRequestId: string; contactHandle: string; subject: string },
  ) {
    await this.access.assertAllowed(actor);
    const item = await this.connection(actor.workspaceId);
    if (!item) throw unavailable();
    return this.inbox.ensureEmailDraftConversation(actor, {
      ...input,
      providerConnectionId: item.binding.connectionId,
    });
  }

  async cloneAttachment(
    actor: HermesMessagingActor,
    input: {
      sourceConversationId: string;
      sourceAssetId: string;
      targetConversationId: string;
    },
  ) {
    await this.access.assertAllowed(actor);
    const item = await this.connection(actor.workspaceId);
    if (!item || !this.media) throw unavailable();
    for (const id of [input.sourceConversationId, input.targetConversationId]) {
      if (
        !(await this.conversations.findOneBy({
          workspaceId: actor.workspaceId,
          id,
          channel: 'EMAIL',
          providerConnectionId: item.binding.connectionId,
        }))
      )
        throw unavailable();
    }
    return this.media.cloneForConversation(actor, input);
  }

  async draftAttachments(
    actor: HermesMessagingActor,
    conversationId: string,
    attachmentIds: string[],
  ) {
    if (!this.media && attachmentIds.length) throw unavailable();
    if (
      attachmentIds.length > 10 ||
      new Set(attachmentIds).size !== attachmentIds.length
    )
      throw new BadRequestException('MAIL_INVALID_ATTACHMENTS');
    const attachments = [];
    let total = 0;
    for (const assetId of attachmentIds) {
      const { bytes, asset } = await this.media!.bytes(actor, {
        conversationId,
        assetId,
      });
      total += bytes.length;
      if (total > 25 * 1024 * 1024)
        throw new BadRequestException('MAIL_ATTACHMENTS_TOO_LARGE');
      attachments.push({
        filename: asset.filename,
        contentType: asset.mimeType,
        content: bytes,
      });
    }
    return attachments;
  }

  async replyRich(
    actor: HermesMessagingActor,
    input: {
      conversationId: string;
      clientRequestId: string;
      envelope: NonNullable<HermesMessagingSend['email']>;
      attachmentIds: string[];
    },
  ) {
    await this.access.assertAllowed(actor);
    const item = await this.connection(actor.workspaceId);
    const conversation =
      item &&
      (await this.conversations.findOneBy({
        workspaceId: actor.workspaceId,
        id: input.conversationId,
        channel: 'EMAIL',
        providerConnectionId: item.binding.connectionId,
      }));
    if (!item || !conversation) throw unavailable();
    getConnectedAccountSendableHandleOrThrow({
      connectedAccount: item.account,
      requestedFromHandle: input.envelope.from,
    });
    return this.inbox.replyEmail(actor, input);
  }

  private async sendRich(
    input: HermesMessagingSend,
  ): Promise<HermesMessagingReceipt> {
    const envelope = input.email;
    const item = await this.connection(input.workspaceId);
    if (
      !envelope ||
      !item ||
      item.binding.connectionId !== input.providerConnectionId ||
      !secure(item.account.connectionParameters?.SMTP?.connectionSecurity)
    )
      throw unavailable();
    const sender = mailAddress(
      getConnectedAccountSendableHandleOrThrow({
        connectedAccount: item.account,
        requestedFromHandle: envelope.from,
      }),
    );
    const recipients = [
      ...new Set(
        [...envelope.to, ...envelope.cc, ...envelope.bcc].map(mailAddress),
      ),
    ];
    if (
      !sender ||
      !recipients.length ||
      recipients.some((address) => !address) ||
      recipients.length > 50
    )
      throw unavailable();
    const conversation = await this.conversations.findOneBy({
      id: input.conversationId,
      workspaceId: input.workspaceId,
      channel: 'EMAIL',
      providerConnectionId: input.providerConnectionId,
    });
    if (!conversation) throw unavailable();
    const transport = await this.smtp.getClient(item.account.id, {
      timeoutMs: 15000,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const fresh = await this.connection(input.workspaceId);
      if (
        !fresh ||
        fresh.account.id !== item.account.id ||
        fresh.revision !== item.revision ||
        fresh.account.updatedAt?.getTime() !== item.account.updatedAt?.getTime()
      )
        throw unavailable();
      const result = await Promise.race([
        transport.sendMail({
          from: sender,
          to: envelope.to,
          cc: envelope.cc,
          bcc: envelope.bcc,
          envelope: { from: sender, to: recipients as string[] },
          subject: envelope.subject,
          text: envelope.text,
          ...(envelope.html ? { html: sanitizeMailHtml(envelope.html) } : {}),
          inReplyTo: envelope.inReplyTo,
          references: envelope.references,
          messageId:
            '<' + input.clientRequestId + '@' + sender.split('@')[1] + '>',
          attachments: (input.attachments ?? []).map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.mimeType,
            content: attachment.bytes,
            ...(envelope.inlineAttachments?.find(
              (inline) => inline.assetId === attachment.assetId,
            )
              ? {
                  cid: envelope.inlineAttachments.find(
                    (inline) => inline.assetId === attachment.assetId,
                  )!.cid,
                }
              : {}),
          })),
          disableFileAccess: true,
          disableUrlAccess: true,
        }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            transport.close();
            reject(unavailable());
          }, 30000);
        }),
      ]);
      const accepted = new Set(
        (result.accepted ?? []).map((address: string | { address: string }) =>
          mailAddress(typeof address === 'string' ? address : address.address),
        ),
      );
      const id = mailMessageId(result.messageId);
      if (!id || !recipients.every((address) => accepted.has(address)))
        throw unavailable();
      return {
        providerMessageId: mailProviderId(id),
        acceptedAt: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('SEND_OUTCOME_UNCONFIRMED');
    } finally {
      if (timer) clearTimeout(timer);
      transport.close();
    }
  }

  async send(input: HermesMessagingSend): Promise<HermesMessagingReceipt> {
    if (input.email) return this.sendRich(input);
    const item = await this.connection(input.workspaceId);
    const recipient = mailAddress(input.contactHandle);
    if (
      !item ||
      item.binding.connectionId !== input.providerConnectionId ||
      !recipient ||
      !secure(item.account.connectionParameters?.SMTP?.connectionSecurity)
    )
      throw unavailable();
    const sender = mailAddress(item.account.handle);
    if (!sender || sender === recipient)
      throw new ServiceUnavailableException('INVALID_RECIPIENT');
    const conversation = await this.conversations.findOneBy({
      id: input.conversationId,
      workspaceId: input.workspaceId,
      channel: 'EMAIL',
      providerConnectionId: input.providerConnectionId,
    });
    if (!conversation || mailAddress(conversation.contactHandle) !== recipient)
      throw unavailable();
    const last = await this.messages.findOne({
      where: {
        workspaceId: input.workspaceId,
        conversationId: input.conversationId,
        direction: 'INBOUND',
      },
      order: { occurredAt: 'DESC', id: 'DESC' },
    });
    const replyTo =
      mailMessageId(last?.providerMetadata?.rfcMessageId) ??
      mailMessageId(last?.providerMessageId);
    const rootReference =
      mailMessageId(last?.providerMetadata?.references?.[0]) ??
      mailMessageId(conversation.providerConversationId);
    const transport = await this.smtp.getClient(item.account.id, {
      timeoutMs: 15000,
    });
    try {
      const fresh = await this.connection(input.workspaceId);
      if (
        !fresh ||
        fresh.account.id !== item.account.id ||
        fresh.revision !== item.revision ||
        fresh.account.updatedAt?.getTime() !== item.account.updatedAt?.getTime()
      )
        throw unavailable();
      const pending = transport.sendMail({
        from: sender,
        to: recipient,
        text: input.text,
        subject: ('Re: ' + (conversation.subject ?? ''))
          .replace(/[\r\n\x00]/g, ' ')
          .slice(0, 512),
        messageId:
          '<' + input.clientRequestId + '@' + sender.split('@')[1] + '>',
        ...(replyTo ? { inReplyTo: replyTo } : {}),
        references: [
          ...new Set(
            [rootReference, replyTo].filter((id): id is string => id !== null),
          ),
        ],
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      let sendTimer: ReturnType<typeof setTimeout> | undefined;
      let receipt;
      try {
        receipt = await Promise.race([
          pending,
          new Promise<never>((_resolve, reject) => {
            sendTimer = setTimeout(() => {
              transport.close();
              reject(unavailable());
            }, 30000);
          }),
        ]);
      } finally {
        if (sendTimer) clearTimeout(sendTimer);
      }
      const acceptedId = mailMessageId(receipt.messageId);
      if (
        !receipt.accepted?.some(
          (address: string | { address: string }) =>
            mailAddress(
              typeof address === 'string' ? address : address.address,
            ) === recipient,
        ) ||
        !acceptedId
      )
        throw unavailable();
      return {
        providerMessageId: mailProviderId(acceptedId),
        acceptedAt: new Date().toISOString(),
      };
    } catch {
      // No retry: a missing SMTP DATA acknowledgement is not proof of failure.
      throw new ServiceUnavailableException('SEND_OUTCOME_UNCONFIRMED');
    } finally {
      transport.close();
    }
  }

  @Cron('*/1 * * * *')
  async pollConfiguredMailboxes() {
    if (this.polling) return;
    this.polling = true;
    try {
      let workspaces: string[];
      try {
        workspaces = this.connections
          ? await this.connections.workspaceIds('MAIL')
          : [...this.bindings().keys()];
      } catch {
        return;
      }
      for (const workspaceId of workspaces) {
        try {
          await this.syncWorkspace(workspaceId);
        } catch {
          /* Next poll/UI exposes unavailable; no message is fabricated. */
        }
      }
    } finally {
      this.polling = false;
    }
  }
}
