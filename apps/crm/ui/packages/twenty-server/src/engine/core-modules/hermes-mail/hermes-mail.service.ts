import {
  Injectable,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { IsNull, Raw, Repository } from 'typeorm';

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
import { SmtpClientProvider } from 'src/modules/messaging/message-import-manager/drivers/smtp/providers/smtp-client.provider';

const MAX_MIME_BYTES = 262144;
const MAX_BATCH = 50;
const unavailable = () =>
  new ServiceUnavailableException('MAIL_CONNECTION_UNAVAILABLE');
const secure = (value: unknown) =>
  value === EmailConnectionSecurity.SSL_TLS ||
  value === EmailConnectionSecurity.STARTTLS;

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
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  private bindings() {
    return readHermesMailBindings(this.config.get('HERMES_MAIL_CONNECTIONS'));
  }

  private async connection(workspaceId: string): Promise<{
    binding: HermesMailBinding;
    account: ConnectedAccountEntity;
  } | null> {
    const binding = this.bindings().get(workspaceId);
    if (!binding) return null;
    const account = await this.accounts.findOne({
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
      !account.connectionParameters?.IMAP ||
      !secure(account.connectionParameters.IMAP.connectionSecurity) ||
      account.authFailedAt
    )
      throw unavailable();
    const member = await this.memberships.findOne({
      where: { id: binding.userWorkspaceId, workspaceId, deletedAt: IsNull() },
    });
    if (!member) throw unavailable();
    // Delegation is explicit in server configuration, and revocation is live.
    await this.access.assertAllowed({
      workspaceId,
      userWorkspaceId: member.id,
      userId: member.userId,
    });
    return { binding, account };
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
      const small = summaries
        .filter((entry) => (entry.size ?? MAX_MIME_BYTES + 1) <= MAX_MIME_BYTES)
        .map((entry) => entry.uid);
      const bodies = small.length
        ? await client.fetchAll(
            small.join(','),
            {
              uid: true,
              source: { maxLength: MAX_MIME_BYTES },
              internalDate: true,
            },
            { uid: true },
          )
        : [];
      const byUid = new Map(bodies.map((entry) => [entry.uid, entry]));
      for (const entry of summaries.sort((a, b) => a.uid - b.uid)) {
        const body = byUid.get(entry.uid);
        let source = body?.source;
        if (!source || (entry.size ?? 0) > MAX_MIME_BYTES) {
          result.skipped++;
          const sender = mailAddress(entry.envelope?.from?.[0]?.address);
          if (!sender) continue;
          const id = mailMessageId(entry.envelope?.messageId);
          source = Buffer.from(
            'From: ' +
              sender +
              '\r\n' +
              (id ? 'Message-ID: ' + id + '\r\n' : '') +
              'Subject: ' +
              (entry.envelope?.subject ?? '')
                .replace(/[\r\n\x00]/g, ' ')
                .slice(0, 200) +
              '\r\n\r\n[Email body unavailable or larger than the safe import limit; open the original mailbox.]',
          );
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
        const duplicate = rfcId
          ? await this.messages.findOne({
              where: {
                workspaceId,
                channel: 'EMAIL',
                providerConnectionId: binding.connectionId,
                direction: 'INBOUND',
                text: event.text,
                providerMetadata: Raw(
                  (alias) => alias + " ->> 'rfcMessageId' = :mailRfcId",
                  { mailRfcId: rfcId },
                ),
              },
              relations: { conversation: true },
            })
          : null;
        if (
          duplicate?.conversation?.contactHandle === event.contactHandle &&
          duplicate.conversation.providerConversationId ===
            event.providerConversationId
        ) {
          result.replayed++;
          continue;
        }
        const known =
          rfcId && event.contactHandle === mailAddress(account.handle)
            ? await this.messages.findOne({
                where: {
                  workspaceId,
                  channel: 'EMAIL',
                  providerConnectionId: binding.connectionId,
                  providerMessageId: mailProviderId(rfcId),
                  direction: 'OUTBOUND',
                  status: 'ACCEPTED',
                },
              })
            : null;
        // Only our own confirmed ledger can deduplicate a copied outbound.
        // An arbitrary RFC From/Message-ID never creates a send receipt.
        if (known && known.text === event.text.trim()) {
          result.replayed++;
          continue;
        }
        const saved = await this.inbox.ingest(event);
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

  async send(input: HermesMessagingSend): Promise<HermesMessagingReceipt> {
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
    const transport = await this.smtp.getClient(item.account.id);
    try {
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
        workspaces = [...this.bindings().keys()];
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
