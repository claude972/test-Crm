import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { type ImapFlow } from 'imapflow';
import PostalMime from 'postal-mime';
import MailComposer from 'nodemailer/lib/mail-composer';
import { getSendableEmailHandles } from 'kovaa-lab-shared/utils';

import { messagingId } from 'src/engine/core-modules/hermes-messaging/hermes-messaging.policy';
import { HermesMessagingPersonService } from 'src/engine/core-modules/hermes-messaging/hermes-messaging-person.service';
import { mailAddress } from 'src/engine/core-modules/hermes-mail/hermes-mail.policy';
import { HermesMailService } from 'src/engine/core-modules/hermes-mail/hermes-mail.service';
import {
  type HermesMailComposeInput,
  type HermesMailMessageInput,
  type HermesMailNewDraftInput,
  type HermesMailPageInput,
  type HermesMailPage,
  type HermesMailUpdateInput,
} from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.dto';
import {
  MAIL_MAX_SOURCE_BYTES,
  mailAddresses,
  mailHeader,
  mailContentSignature,
  mailParsedContentSignature,
  mailThreadKey,
  planMailEnvelope,
  sanitizeMailHtml,
} from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.policy';
import { type HermesMessagingActor } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';
import { HermesProspectionAccessService } from 'src/engine/core-modules/hermes-prospection/hermes-prospection-access.service';
import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';

@Injectable()
export class HermesMailboxService {
  private readonly expiredClients = new WeakSet<ImapFlow>();
  private readonly clientAccounts = new WeakMap<
    ImapFlow,
    {
      id: string;
      revision?: number;
      bindingRevision?: string;
      connectionId: string;
    }
  >();

  // ImapFlow otherwise emulates MOVE with COPY + DELETE/EXPUNGE. Only
  // native MOVE (also mandatory in active IMAP4rev2) may reach messageMove.
  private canMove(client: ImapFlow) {
    return !!(
      client.capabilities?.has('MOVE') ||
      client.enabled?.has('IMAP4REV2') ||
      (client.capabilities?.has('IMAP4rev2') &&
        !client.capabilities?.has('IMAP4rev1'))
    );
  }
  private requireSafeMove(client: ImapFlow) {
    if (!this.canMove(client))
      throw new ConflictException('MAIL_SAFE_MOVE_UNAVAILABLE');
  }

  private alive(client: ImapFlow) {
    if (this.expiredClients.has(client))
      throw new ServiceUnavailableException('MAIL_TIMEOUT');
  }

  private async current(actor: HermesMessagingActor, client: ImapFlow) {
    if (this.expiredClients.has(client))
      throw new ServiceUnavailableException('MAIL_TIMEOUT');
    await this.access.assertAllowed(actor);
    const expected = this.clientAccounts.get(client);
    const fresh = await this.mail.connection(actor.workspaceId);
    if (
      !expected ||
      !fresh ||
      fresh.account.id !== expected.id ||
      fresh.binding.connectionId !== expected.connectionId ||
      fresh.account.updatedAt?.getTime() !== expected.revision ||
      fresh.revision !== expected.bindingRevision
    )
      throw new ConflictException('MAIL_CONNECTION_CHANGED');
    if (this.expiredClients.has(client))
      throw new ServiceUnavailableException('MAIL_TIMEOUT');
  }
  constructor(
    private readonly mail: HermesMailService,
    private readonly imap: ImapClientProvider,
    private readonly access: HermesProspectionAccessService,
    @Optional() private readonly people?: HermesMessagingPersonService,
  ) {}

  private folder(value: string) {
    mailHeader(value, 128);
    if (!value.trim()) throw new BadRequestException('MAIL_INVALID_FOLDER');
    return value;
  }

  private async session<T>(
    actor: HermesMessagingActor,
    run: (
      client: ImapFlow,
      item: NonNullable<Awaited<ReturnType<HermesMailService['connection']>>>,
    ) => Promise<T>,
  ): Promise<T> {
    await this.access.assertAllowed(actor);
    const item = await this.mail.connection(actor.workspaceId);
    if (!item) throw new ServiceUnavailableException('MAIL_NOT_CONFIGURED');
    const client = await this.imap.getClient(item.account.id);
    this.clientAccounts.set(client, {
      id: item.account.id,
      revision: item.account.updatedAt?.getTime(),
      bindingRevision: item.revision,
      connectionId: item.binding.connectionId,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    try {
      const result = await Promise.race([
        run(client, item),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            expired = true;
            this.expiredClients.add(client);
            client.close();
            reject(new ServiceUnavailableException('MAIL_TIMEOUT'));
          }, 45000);
        }),
      ]);
      if (expired) throw new ServiceUnavailableException('MAIL_TIMEOUT');
      await this.access.assertAllowed(actor);
      const fresh = await this.mail.connection(actor.workspaceId);
      if (
        !fresh ||
        fresh.account.id !== item.account.id ||
        fresh.revision !== item.revision ||
        fresh.account.updatedAt?.getTime() !== item.account.updatedAt?.getTime()
      )
        throw new ConflictException('MAIL_CONNECTION_CHANGED');
      return result;
    } finally {
      if (timer) clearTimeout(timer);
      this.expiredClients.add(client);
      await this.imap.closeClient(client);
    }
  }

  async folders(actor: HermesMessagingActor) {
    await this.access.assertAllowed(actor);
    if (!(await this.mail.connection(actor.workspaceId)))
      return { state: 'NOT_CONFIGURED', folders: [] };
    return this.session(actor, async (client) => {
      const folders = await client.list();
      await this.current(actor, client);
      const result = [];
      for (const folder of folders.slice(0, 200)) {
        await this.current(actor, client);
        if (folder.flags.has('\\Noselect')) continue;
        let total: number | null = null;
        let unread: number | null = null;
        try {
          const status = await client.status(folder.path, {
            messages: true,
            unseen: true,
          });
          total = status.messages ?? null;
          unread = status.unseen ?? null;
        } catch {
          /* Unknown counters stay null. */
        }
        const role =
          folder.path.toUpperCase() === 'INBOX'
            ? 'INBOX'
            : ((
                {
                  '\\Sent': 'SENT',
                  '\\Drafts': 'DRAFTS',
                  '\\Archive': 'ARCHIVE',
                  '\\Trash': 'TRASH',
                } as Record<string, string>
              )[folder.specialUse ?? ''] ?? 'CUSTOM');
        result.push({
          path: folder.path,
          name: folder.name,
          role,
          total,
          unread,
        });
      }
      return {
        state: 'AVAILABLE',
        folders: result,
        capabilities: {
          uidMove: this.canMove(client),
          moveUnavailableReason: this.canMove(client)
            ? null
            : 'MAIL_SAFE_MOVE_UNAVAILABLE',
        },
      };
    });
  }

  private async locked<T>(
    client: ImapFlow,
    actor: HermesMessagingActor,
    scope: HermesMailMessageInput | { folder: string },
    run: () => Promise<T>,
  ) {
    const folder = this.folder(scope.folder);
    const listed = await client.list();
    if (
      !listed.some(
        (item) => item.path === folder && !item.flags.has('\\Noselect'),
      )
    )
      throw new NotFoundException('MAIL_FOLDER_NOT_FOUND');
    await this.current(actor, client);
    const lock = await client.getMailboxLock(folder, {
      acquireTimeout: 10000,
    });
    try {
      await this.current(actor, client);
      if (!client.mailbox) throw new NotFoundException('MAIL_FOLDER_NOT_FOUND');
      if (
        'uid' in scope &&
        (!/^\d{1,10}$/.test(String(scope.uid)) ||
          Number(scope.uid) < 1 ||
          Number(scope.uid) > 4294967295 ||
          String(client.mailbox.uidValidity) !== scope.uidValidity)
      )
        throw new ConflictException('MAIL_UID_VALIDITY_CHANGED');
      return await run();
    } finally {
      lock.release();
    }
  }

  async page(
    actor: HermesMessagingActor,
    input: HermesMailPageInput,
  ): Promise<HermesMailPage> {
    const limit = input.limit ?? 25;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
      throw new BadRequestException('MAIL_INVALID_LIMIT');
    return this.session<HermesMailPage>(actor, (client) =>
      this.locked(client, actor, input, async () => {
        if (!client.mailbox)
          throw new NotFoundException('MAIL_FOLDER_NOT_FOUND');
        const validity = String(client.mailbox.uidValidity);
        let before = 4294967296;
        if (input.cursor) {
          let cursor: { folder: string; validity: string; before: number };
          try {
            cursor = JSON.parse(
              Buffer.from(input.cursor, 'base64url').toString(),
            );
          } catch {
            throw new BadRequestException('MAIL_INVALID_CURSOR');
          }
          if (
            cursor.folder !== input.folder ||
            cursor.validity !== validity ||
            !Number.isSafeInteger(cursor.before) ||
            cursor.before < 1 ||
            cursor.before > before
          )
            throw new ConflictException('MAIL_CURSOR_EXPIRED');
          before = cursor.before;
        }
        const found =
          before > 1
            ? await client.search(
                { uid: '1:' + String(before - 1) },
                { uid: true },
              )
            : [];
        const all = (Array.isArray(found) ? found : [])
          .filter((uid) => uid < before)
          .sort((a, b) => b - a);
        const selected = all.slice(0, limit);
        const fetched = selected.length
          ? await client.fetchAll(
              selected.join(','),
              {
                uid: true,
                envelope: true,
                flags: true,
                internalDate: true,
                size: true,
              },
              { uid: true },
            )
          : [];
        return {
          state: 'AVAILABLE',
          folder: input.folder,
          uidValidity: validity,
          messages: fetched
            .sort((a, b) => b.uid - a.uid)
            .map((message) => ({
              uid: String(message.uid),
              subject: message.envelope?.subject ?? '',
              from: (message.envelope?.from ?? []).map((address) => ({
                address: mailAddress(address.address),
                name: address.name ?? null,
              })),
              to: (message.envelope?.to ?? []).map((address) => ({
                address: mailAddress(address.address),
                name: address.name ?? null,
              })),
              cc: (message.envelope?.cc ?? []).map((address) => ({
                address: mailAddress(address.address),
                name: address.name ?? null,
              })),
              occurredAt:
                message.internalDate instanceof Date &&
                Number.isFinite(message.internalDate.getTime())
                  ? message.internalDate.toISOString()
                  : null,
              seen: message.flags?.has('\\Seen') ?? null,
              size: message.size ?? null,
            })),
          nextCursor:
            all.length > limit
              ? Buffer.from(
                  JSON.stringify({
                    folder: input.folder,
                    validity,
                    before: selected[selected.length - 1],
                  }),
                ).toString('base64url')
              : null,
        };
      }),
    );
  }

  private async source(client: ImapFlow, input: HermesMailMessageInput) {
    const summary = await client.fetchOne(
      String(input.uid),
      { uid: true, size: true, internalDate: true },
      { uid: true },
    );
    if (!summary || summary.uid !== Number(input.uid))
      throw new NotFoundException('MAIL_MESSAGE_NOT_FOUND');
    if (
      typeof summary.size !== 'number' ||
      summary.size > MAIL_MAX_SOURCE_BYTES
    )
      throw new BadRequestException('MAIL_MESSAGE_TOO_LARGE');
    const message = await client.fetchOne(
      String(input.uid),
      { uid: true, source: { maxLength: MAIL_MAX_SOURCE_BYTES } },
      { uid: true },
    );
    if (
      !message ||
      message.uid !== Number(input.uid) ||
      !message.source ||
      message.source.length !== summary.size
    )
      throw new ConflictException('MAIL_MESSAGE_CHANGED');
    const parsed = await PostalMime.parse(message.source, {
      maxNestingDepth: 30,
      maxHeadersSize: 256 * 1024,
    });
    return Object.assign(parsed, {
      mimeSha256: createHash('sha256').update(message.source).digest('hex'),
      internalDate: summary.internalDate,
    });
  }

  async message(actor: HermesMessagingActor, input: HermesMailMessageInput) {
    return this.session(actor, (client, item) =>
      this.locked(client, actor, input, async () => {
        const parsed = await this.source(client, input);
        await this.current(actor, client);
        const observed = await this.mail.observe(
          actor,
          { ...input, internalDate: parsed.internalDate },
          parsed,
          true,
          () => this.alive(client),
          parsed.mimeSha256,
        );
        return {
          conversationId: observed.conversationId,
          messageId: observed.messageId,
          providerConnectionId: observed.providerConnectionId,
          ...(this.people
            ? await this.people.match(actor, 'EMAIL', observed.contactHandle)
            : { personId: null, personMatchStatus: 'UNAVAILABLE' }),
          direction: observed.direction,
          observedOnly: true,
          botUnavailableReason: observed.botUnavailableReason,
          autoReplyBlockedReason: observed.autoReplyBlockedReason,
          state: 'AVAILABLE',
          uid: input.uid,
          uidValidity: input.uidValidity,
          folder: input.folder,
          from: mailAddresses(parsed.from ? [parsed.from] : []),
          to: mailAddresses(parsed.to),
          cc: mailAddresses(parsed.cc),
          ...(actor.userWorkspaceId === item.account.userWorkspaceId
            ? { bcc: mailAddresses(parsed.bcc) }
            : {}),
          subject: parsed.subject ?? '',
          text: parsed.text ?? '',
          html: sanitizeMailHtml(parsed.html),
          remoteImagesBlocked: true,
          threadKey: mailThreadKey(
            parsed,
            getSendableEmailHandles(item.account),
          ),
          attachments: observed.attachments,
        };
      }),
    );
  }

  async update(actor: HermesMessagingActor, input: HermesMailUpdateInput) {
    if (input.seen === undefined && !input.destination)
      throw new BadRequestException('MAIL_EMPTY_UPDATE');
    return this.session(actor, (client) =>
      this.locked(client, actor, input, async () => {
        if (input.destination) {
          this.folder(input.destination);
          const existing = (await client.list()).some(
            (folder) =>
              folder.path === input.destination &&
              !folder.flags.has('\\Noselect'),
          );
          if (!existing)
            throw new NotFoundException('MAIL_DESTINATION_NOT_FOUND');
          this.requireSafeMove(client);
        }
        const message = await client.fetchOne(
          String(input.uid),
          { uid: true },
          { uid: true },
        );
        if (!message || message.uid !== Number(input.uid))
          throw new NotFoundException('MAIL_MESSAGE_NOT_FOUND');
        await this.current(actor, client);
        if (input.seen !== undefined) {
          const changed = input.seen
            ? await client.messageFlagsAdd(String(input.uid), ['\\Seen'], {
                uid: true,
              })
            : await client.messageFlagsRemove(String(input.uid), ['\\Seen'], {
                uid: true,
              });
          if (!changed) throw new ConflictException('MAIL_UPDATE_FAILED');
        }
        if (input.destination) {
          await this.current(actor, client);
          this.requireSafeMove(client);
          if (
            !(await client.messageMove(String(input.uid), input.destination, {
              uid: true,
            }))
          )
            throw new ConflictException('MAIL_MOVE_FAILED');
        }
        return { state: 'UPDATED' };
      }),
    );
  }

  private async sentCopy(
    actor: HermesMessagingActor,
    input: {
      id: string;
      conversationId: string;
      status: string;
    },
    envelope: ReturnType<typeof planMailEnvelope>,
    clientRequestId: string,
    attachmentIds: string[],
  ) {
    if (input.status !== 'ACCEPTED')
      return { ...input, sentCopy: { state: 'NOT_ACCEPTED' } };
    try {
      const sentCopy = await this.session(actor, async (client, item) => {
        const sent = (await client.list()).find(
          (folder) =>
            folder.specialUse === '\\Sent' && !folder.flags.has('\\Noselect'),
        );
        if (!sent)
          return { state: 'UNAVAILABLE', reason: 'MAIL_SENT_FOLDER_NOT_FOUND' };
        return this.locked(client, actor, { folder: sent.path }, async () => {
          const uidValidity = String(
            client.mailbox && client.mailbox.uidValidity,
          );
          const attachments = await this.mail.draftAttachments(
            actor,
            input.conversationId,
            attachmentIds,
          );
          const signature = mailContentSignature(
            envelope,
            attachments.map((file) => ({
              filename: file.filename,
              mimeType: file.contentType,
              bytes: file.content,
            })),
          );
          const messageId =
            '<' + clientRequestId + '@' + envelope.from.split('@')[1] + '>';
          const checkpoint = (
            action: 'RESERVE' | 'UNCONFIRMED' | 'SAVED',
            scope?: { uid: string; mimeSha256: string },
          ) =>
            this.mail.recordSentCopy(
              actor,
              {
                messageId: input.id,
                conversationId: input.conversationId,
                clientRequestId,
                connectionId: item.binding.connectionId,
                connectionRevision: item.revision,
                accountId: item.account.id,
                accountRevision: item.account.updatedAt?.getTime(),
                action,
                rfcMessageId: messageId,
                ...(scope
                  ? { scope: { folder: sent.path, uidValidity, ...scope } }
                  : {}),
              },
              () => this.alive(client),
            );
          const found = await client.search(
            { header: { 'message-id': messageId } },
            { uid: true },
          );
          if (Array.isArray(found) && found.length > 20)
            return { state: 'UNCONFIRMED', reason: 'MAIL_SENT_MATCH_LIMIT' };
          let scope: { uid: string; mimeSha256: string } | undefined;
          for (const uid of Array.isArray(found) ? found : []) {
            const source = await this.source(client, {
              folder: sent.path,
              uid: String(uid),
              uidValidity,
            });
            if (
              source.messageId === messageId &&
              (mailParsedContentSignature(source) === signature ||
                (!source.bcc?.length &&
                  mailParsedContentSignature(source) ===
                    mailContentSignature(
                      { ...envelope, bcc: [] },
                      attachments.map((file) => ({
                        filename: file.filename,
                        mimeType: file.contentType,
                        bytes: file.content,
                      })),
                    )))
            )
              scope = { uid: String(uid), mimeSha256: source.mimeSha256 };
          }
          const replay = !!scope;
          if (!scope) {
            const reserved = await checkpoint('RESERVE');
            if (!reserved.appendAllowed)
              return { state: 'UNCONFIRMED', reason: 'MAIL_SENT_SEARCH_ONLY' };
            const compiled = new MailComposer({
              ...envelope,
              messageId,
              attachments,
              disableFileAccess: true,
              disableUrlAccess: true,
            }).compile();
            compiled.keepBcc = true;
            const raw = await compiled.build();
            await this.current(actor, client);
            let result;
            try {
              result = await client.append(sent.path, raw, ['\\Seen']);
            } catch {
              await checkpoint('UNCONFIRMED');
              return {
                state: 'UNCONFIRMED',
                reason: 'MAIL_SENT_APPEND_UNCONFIRMED',
              };
            }
            if (
              !result ||
              !result.uid ||
              String(result.uidValidity) !== uidValidity
            ) {
              await checkpoint('UNCONFIRMED');
              return {
                state: 'UNCONFIRMED',
                reason: 'MAIL_SENT_APPEND_UNCONFIRMED',
              };
            }
            await this.current(actor, client);
            const actual = await this.source(client, {
              folder: sent.path,
              uid: String(result.uid),
              uidValidity,
            });
            if (
              actual.messageId !== messageId ||
              mailParsedContentSignature(actual) !== signature
            )
              return {
                state: 'UNCONFIRMED',
                reason: 'MAIL_SENT_CONTENT_CHANGED',
              };
            scope = { uid: String(result.uid), mimeSha256: actual.mimeSha256 };
          }
          await this.current(actor, client);
          await checkpoint('SAVED', scope);
          return {
            state: 'SAVED',
            replay,
            folder: sent.path,
            uidValidity,
            uid: scope.uid,
          };
        });
      });
      return { ...input, sentCopy };
    } catch {
      // The durable ledger has already accepted this send. Failed storage of
      // its native copy must never trigger another SMTP attempt.
      return {
        ...input,
        sentCopy: {
          state: 'UNCONFIRMED',
          reason: 'MAIL_SENT_COPY_UNCONFIRMED',
        },
      };
    } finally {
      // MAIL006: the copy awaited provider I/O after acceptance, so the actor
      // is re-authorized here, once the wait is over. A revocation observed
      // during the copy propagates from this finally instead of being
      // swallowed by the catch above, so the already accepted message is
      // never handed back to an actor who lost access. Nothing is replayed
      // and no ledger record is rewritten: the acceptance stays acquired and
      // an uncertain copy stays uncertain.
      await this.access.assertAllowed(actor);
    }
  }

  private async disposeAcceptedDraft(
    actor: HermesMessagingActor,
    receipt: {
      status: string;
      providerConnectionId: string;
      conversationId: string;
    },
    draftId: string,
    envelope: ReturnType<typeof planMailEnvelope>,
    attachmentIds: string[],
  ) {
    if (receipt.status !== 'ACCEPTED') return { state: 'NOT_ACCEPTED' };
    try {
      return await this.session(actor, async (client, item) => {
        if (receipt.providerConnectionId !== item.binding.connectionId)
          return { state: 'UNAVAILABLE', reason: 'MAIL_CONNECTION_CHANGED' };
        const listed = await client.list();
        const drafts = listed.find(
          (folder) =>
            folder.specialUse === '\\Drafts' && !folder.flags.has('\\Noselect'),
        );
        const trash = listed.find(
          (folder) =>
            folder.specialUse === '\\Trash' && !folder.flags.has('\\Noselect'),
        );
        if (!drafts || !trash)
          return {
            state: 'UNAVAILABLE',
            reason: 'MAIL_DRAFT_DISPOSITION_UNAVAILABLE',
          };
        return this.locked(client, actor, { folder: drafts.path }, async () => {
          const validity = String(client.mailbox && client.mailbox.uidValidity);
          const messageId = `<hermes-draft-${draftId}@hermes.invalid>`;
          const attachments = await this.mail.draftAttachments(
            actor,
            receipt.conversationId,
            attachmentIds,
          );
          const signature = mailContentSignature(
            envelope,
            attachments.map((file) => ({
              filename: file.filename,
              mimeType: file.contentType,
              bytes: file.content,
            })),
          );
          const found = await client.search(
            { header: { 'message-id': messageId } },
            { uid: true },
          );
          if (Array.isArray(found) && found.length > 20)
            return { state: 'UNCONFIRMED', reason: 'MAIL_DRAFT_MATCH_LIMIT' };
          const matching = [];
          for (const uid of Array.isArray(found) ? found : []) {
            const source = await this.source(client, {
              folder: drafts.path,
              uid: String(uid),
              uidValidity: validity,
            });
            if (
              source.messageId === messageId &&
              mailParsedContentSignature(source) === signature
            )
              matching.push(uid);
          }
          if (!matching.length) return { state: 'NOT_FOUND' };
          await this.current(actor, client);
          if (!this.canMove(client))
            return {
              state: 'UNAVAILABLE',
              reason: 'MAIL_SAFE_MOVE_UNAVAILABLE',
            };
          if (
            !(await client.messageMove(matching.join(','), trash.path, {
              uid: true,
            }))
          )
            return {
              state: 'UNCONFIRMED',
              reason: 'MAIL_DRAFT_DISPOSITION_UNCONFIRMED',
            };
          await this.current(actor, client);
          return { state: 'MOVED_TO_TRASH' };
        });
      });
    } catch {
      return {
        state: 'UNCONFIRMED',
        reason: 'MAIL_DRAFT_DISPOSITION_UNCONFIRMED',
      };
    }
  }

  async send(actor: HermesMessagingActor, input: HermesMailComposeInput) {
    if (!input.clientRequestId)
      throw new BadRequestException('MAIL_REQUEST_ID_REQUIRED');
    const planned = await this.session(actor, (client, item) =>
      this.locked(client, actor, input, async () => {
        const source = await this.source(client, input);
        const envelope = planMailEnvelope({
          ...input,
          mode: input.mode as 'REPLY' | 'REPLY_ALL' | 'FORWARD',
          source,
          ownAddresses: getSendableEmailHandles(item.account),
        });
        await this.current(actor, client);
        const observed = await this.mail.observe(
          actor,
          { ...input, internalDate: source.internalDate },
          source,
          true,
          () => this.alive(client),
          source.mimeSha256,
        );
        const conversationId =
          input.mode === 'FORWARD'
            ? (
                await this.mail.draftConversation(actor, {
                  clientRequestId: input.clientRequestId!,
                  contactHandle:
                    envelope.to[0] ?? envelope.cc[0] ?? envelope.from,
                  subject: envelope.subject,
                })
              ).id
            : observed.conversationId;
        if (input.conversationId && input.conversationId !== conversationId)
          throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
        return { envelope, conversationId };
      }),
    );
    const result = await this.mail.replyRich(actor, {
      ...planned,
      clientRequestId: input.clientRequestId,
      attachmentIds: input.attachmentIds ?? [],
    });
    return this.sentCopy(
      actor,
      result,
      planned.envelope,
      input.clientRequestId,
      input.attachmentIds ?? [],
    );
  }

  async sendNew(actor: HermesMessagingActor, input: HermesMailNewDraftInput) {
    if (!input.clientRequestId)
      throw new BadRequestException('MAIL_REQUEST_ID_REQUIRED');
    return this.mail.withDraftLock(
      actor,
      input.draftId ?? input.clientRequestId,
      async () => {
        const planned = await this.session(actor, async (client, item) => {
          const envelope = planMailEnvelope({
            ...input,
            mode: 'NEW',
            source: {
              headers: [],
              headerLines: [],
              attachments: [],
              subject: input.subject,
            },
            ownAddresses: getSendableEmailHandles(item.account),
          });
          await this.current(actor, client);
          const conversation = await this.mail.draftConversation(
            actor,
            {
              clientRequestId: input.draftId ?? input.clientRequestId!,
              contactHandle: envelope.to[0] ?? envelope.cc[0] ?? envelope.from,
              subject: envelope.subject,
            },
            () => this.alive(client),
            false,
            input.clientRequestId,
          );
          if (input.conversationId && input.conversationId !== conversation.id)
            throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
          return { envelope, conversationId: conversation.id };
        });
        const result = await this.mail.replyRich(actor, {
          ...planned,
          clientRequestId: input.clientRequestId!,
          attachmentIds: input.attachmentIds ?? [],
        });
        const copied = await this.sentCopy(
          actor,
          result,
          planned.envelope,
          input.clientRequestId!,
          input.attachmentIds ?? [],
        );
        const draftDisposition = input.draftId
          ? await this.disposeAcceptedDraft(
              actor,
              result,
              input.draftId,
              planned.envelope,
              input.attachmentIds ?? [],
            )
          : { state: 'NOT_REQUESTED' };
        return { ...copied, draftDisposition };
      },
    );
  }

  async createDraft(
    actor: HermesMessagingActor,
    input: HermesMailNewDraftInput,
  ) {
    const draftId = input.draftId ?? input.clientRequestId;
    if (!draftId) throw new BadRequestException('MAIL_DRAFT_ID_REQUIRED');
    return this.mail.withDraftLock(actor, draftId, () =>
      this.session(actor, async (client, item) => {
        const envelope = planMailEnvelope(
          {
            ...input,
            mode: 'NEW',
            source: {
              headers: [],
              headerLines: [],
              attachments: [],
              subject: input.subject,
            },
            ownAddresses: getSendableEmailHandles(item.account),
          },
          { allowEmptyRecipients: true },
        );
        const expectedConversationId = messagingId(
          actor.workspaceId,
          'EMAIL',
          item.binding.connectionId,
          `draft:${draftId}`,
        );
        if (
          input.conversationId &&
          input.conversationId !== expectedConversationId
        )
          throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
        const listed = await client.list();
        const drafts = listed.find(
          (folder) =>
            folder.specialUse === '\\Drafts' && !folder.flags.has('\\Noselect'),
        );
        if (!drafts)
          throw new NotFoundException('MAIL_DRAFTS_FOLDER_NOT_FOUND');
        const trash = listed.find(
          (folder) =>
            folder.specialUse === '\\Trash' && !folder.flags.has('\\Noselect'),
        );
        return this.locked(client, actor, { folder: drafts.path }, async () => {
          const validity = String(client.mailbox && client.mailbox.uidValidity);
          if (!/^\d{1,32}$/.test(validity))
            throw new ConflictException('MAIL_UID_VALIDITY_CHANGED');
          const messageId = '<hermes-draft-' + draftId + '@hermes.invalid>';
          const found = await client.search(
            { header: { 'message-id': messageId } },
            { uid: true },
          );
          const old = Array.isArray(found) ? found.sort((a, b) => a - b) : [];
          if (old.length > 20)
            throw new ConflictException('MAIL_DRAFT_MATCH_LIMIT');
          let latestRevision: string | null = null;
          for (const uid of old) {
            await this.current(actor, client);
            const source = await this.source(client, {
              folder: drafts.path,
              uid: String(uid),
              uidValidity: validity,
            });
            if (
              source.messageId !== messageId ||
              !getSendableEmailHandles(item.account)
                .map(mailAddress)
                .includes(mailAddress(source.from?.address))
            )
              throw new ConflictException('MAIL_DRAFT_IDENTITY_CONFLICT');
            latestRevision = mailParsedContentSignature(source);
          }
          if (input.draftRevision && input.draftRevision !== latestRevision)
            throw new ConflictException('MAIL_DRAFT_REVISION_CONFLICT');
          const attachments = await this.mail.draftAttachments(
            actor,
            expectedConversationId,
            input.attachmentIds ?? [],
          );
          const draftRevision = mailContentSignature(
            envelope,
            attachments.map((file) => ({
              filename: file.filename,
              mimeType: file.contentType,
              bytes: file.content,
            })),
          );
          if (latestRevision !== draftRevision && old.length && !trash)
            throw new ConflictException('MAIL_DRAFT_REPLACE_UNAVAILABLE');
          if (latestRevision !== draftRevision && old.length)
            this.requireSafeMove(client);
          const conversation = await this.mail.draftConversation(
            actor,
            {
              clientRequestId: draftId,
              contactHandle: envelope.to[0] ?? envelope.cc[0] ?? envelope.from,
              subject: envelope.subject,
            },
            () => this.alive(client),
            true,
          );
          if (input.conversationId && input.conversationId !== conversation.id)
            throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
          if (conversation.id !== expectedConversationId)
            throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
          if (latestRevision === draftRevision && old.length)
            return {
              state: 'SAVED',
              replay: true,
              draftId,
              draftRevision,
              conversationId: conversation.id,
              folder: drafts.path,
              uid: String(old[old.length - 1]),
              uidValidity: validity,
            };
          const compiled = new MailComposer({
            ...envelope,
            messageId,
            attachments,
            disableFileAccess: true,
            disableUrlAccess: true,
          }).compile();
          compiled.keepBcc = true;
          const raw = await compiled.build();
          await this.current(actor, client);
          let result;
          try {
            result = await client.append(drafts.path, raw, ['\\Draft']);
          } catch {
            throw new ServiceUnavailableException(
              'MAIL_DRAFT_SAVE_UNCONFIRMED',
            );
          }
          if (!result || !result.uid || String(result.uidValidity) !== validity)
            throw new ServiceUnavailableException(
              'MAIL_DRAFT_SAVE_UNCONFIRMED',
            );
          await this.current(actor, client);
          if (old.length) this.requireSafeMove(client);
          if (
            old.length &&
            !(await client.messageMove(old.join(','), trash!.path, {
              uid: true,
            }))
          )
            throw new ConflictException('MAIL_DRAFT_REPLACE_UNCONFIRMED');
          await this.current(actor, client);
          return {
            state: 'SAVED',
            replay: false,
            draftId,
            draftRevision,
            conversationId: conversation.id,
            folder: drafts.path,
            uid: String(result.uid),
            uidValidity: validity,
          };
        });
      }),
    );
  }

  async compose(
    actor: HermesMessagingActor,
    input: HermesMailComposeInput,
    draft: boolean,
  ) {
    if (input.mode === 'FORWARD' && !input.clientRequestId)
      throw new BadRequestException('MAIL_REQUEST_ID_REQUIRED');
    return this.session(actor, (client, item) =>
      this.locked(client, actor, input, async () => {
        const source = await this.source(client, input);
        const envelope = planMailEnvelope({
          ...input,
          mode: input.mode as 'REPLY' | 'REPLY_ALL' | 'FORWARD',
          source,
          ownAddresses: getSendableEmailHandles(item.account),
        });
        await this.current(actor, client);
        const observed = await this.mail.observe(
          actor,
          { ...input, internalDate: source.internalDate },
          source,
          true,
          () => this.alive(client),
          source.mimeSha256,
        );
        const conversationId =
          input.mode === 'FORWARD'
            ? (
                await this.mail.draftConversation(actor, {
                  clientRequestId: input.clientRequestId!,
                  contactHandle:
                    envelope.to[0] ?? envelope.cc[0] ?? envelope.from,
                  subject: envelope.subject,
                })
              ).id
            : observed.conversationId;
        if (input.conversationId && input.conversationId !== conversationId)
          throw new ConflictException('MAIL_CONVERSATION_MISMATCH');
        if (!draft) return { state: 'PLANNED', envelope, conversationId };
        const attachments = await this.mail.draftAttachments(
          actor,
          conversationId,
          input.attachmentIds ?? [],
        );
        const drafts = (await client.list()).find(
          (folder) => folder.specialUse === '\\Drafts',
        );
        if (!drafts)
          throw new NotFoundException('MAIL_DRAFTS_FOLDER_NOT_FOUND');
        const compiled = new MailComposer({
          ...envelope,
          attachments,
          disableFileAccess: true,
          disableUrlAccess: true,
        }).compile();
        compiled.keepBcc = true;
        const raw = await compiled.build();
        await this.current(actor, client);
        const result = await client.append(drafts.path, raw, ['\\Draft']);
        if (!result)
          throw new ServiceUnavailableException('MAIL_DRAFT_NOT_SAVED');
        return {
          state: 'SAVED',
          conversationId,
          folder: drafts.path,
          uid: result.uid ?? null,
          uidValidity: result.uidValidity ? String(result.uidValidity) : null,
        };
      }),
    );
  }
}
