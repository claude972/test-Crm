import { isEmail, isUUID } from 'class-validator';
import { createHash } from 'node:crypto';
import PostalMime from 'postal-mime';

import { mailThreadKey } from 'src/engine/core-modules/hermes-mail/hermes-mail-v4.policy';
import { type HermesMessagingEvent } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

export type HermesMailBinding = {
  connectionId: string;
  connectedAccountId: string;
  userWorkspaceId: string;
  mailbox: string;
};

export const readHermesMailBindings = (
  serialized: string,
): Map<string, HermesMailBinding> => {
  if (Buffer.byteLength(serialized) > 65536)
    throw new Error('MAIL_CONFIG_INVALID');
  const raw: unknown = JSON.parse(serialized);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('MAIL_CONFIG_INVALID');
  const entries = Object.entries(raw);
  if (entries.length > 100) throw new Error('MAIL_CONFIG_INVALID');
  const bindings = new Map<string, HermesMailBinding>();
  for (const [workspaceId, value] of entries) {
    if (
      !isUUID(workspaceId) ||
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    )
      throw new Error('MAIL_CONFIG_INVALID');
    const item = value as Record<string, unknown>;
    if (
      Object.keys(item).some(
        (key) =>
          ![
            'connectionId',
            'connectedAccountId',
            'userWorkspaceId',
            'mailbox',
          ].includes(key),
      ) ||
      typeof item.connectedAccountId !== 'string' ||
      !isUUID(item.connectedAccountId) ||
      typeof item.userWorkspaceId !== 'string' ||
      !isUUID(item.userWorkspaceId) ||
      typeof item.connectionId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(item.connectionId) ||
      (item.mailbox !== undefined &&
        (typeof item.mailbox !== 'string' ||
          !item.mailbox.trim() ||
          item.mailbox.length > 128 ||
          /[\r\n\x00]/.test(item.mailbox)))
    )
      throw new Error('MAIL_CONFIG_INVALID');
    bindings.set(workspaceId, {
      connectionId: item.connectionId,
      connectedAccountId: item.connectedAccountId,
      userWorkspaceId: item.userWorkspaceId,
      mailbox: typeof item.mailbox === 'string' ? item.mailbox : 'INBOX',
    });
  }
  return bindings;
};

export const mailAddress = (value: unknown): string | null =>
  typeof value === 'string' &&
  value.length <= 320 &&
  !/[\r\n\x00<>]/.test(value) &&
  isEmail(value.trim())
    ? value.trim().toLowerCase()
    : null;

export const mailMessageId = (value: unknown): string | null =>
  typeof value === 'string' &&
  Buffer.byteLength(value.trim(), 'utf8') <= 998 &&
  /^<[^<>\s\x00-\x1f\x7f]{1,900}>$/.test(value.trim())
    ? value.trim()
    : null;

export const mailProviderId = (value: string) =>
  value.length <= 256 && /^[\x20-\x7e]+$/.test(value)
    ? value
    : 'mail-sha256:' + createHash('sha256').update(value).digest('hex');

export async function parseHermesMail(input: {
  source: Buffer;
  parsed?: Awaited<ReturnType<typeof PostalMime.parse>>;
  mimeSha256?: string;
  workspaceId: string;
  connectionId: string;
  mailbox: string;
  uid: number;
  uidValidity: string;
  internalDate?: Date | string;
  ownAddress?: string;
  ownAddresses?: string[];
}): Promise<HermesMessagingEvent | null> {
  const parsed =
    input.parsed ??
    (await PostalMime.parse(input.source, {
      maxNestingDepth: 30,
      maxHeadersSize: 256 * 1024,
    }));
  const sender = mailAddress(parsed.from?.address);
  if (!sender) return null;
  const physicalId =
    'imap:' + input.mailbox + ':' + input.uidValidity + ':' + input.uid;
  const messageId =
    mailMessageId(parsed.messageId) ??
    'imap:' + input.mailbox + ':' + input.uidValidity + ':' + input.uid;
  const references = (parsed.references ?? '').match(/<[^<>\s]+>/g) ?? [];
  const thread =
    references.map(mailMessageId).find((item) => item !== null) ??
    mailMessageId(parsed.inReplyTo) ??
    messageId;
  const date = new Date(
    String(input.internalDate ?? parsed.date ?? new Date().toISOString()),
  );
  const text = (
    parsed.text ??
    parsed.html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ') ??
    ''
  )
    .replace(/\x00/g, '')
    .trim();
  // Text-only inbox: no remote images/HTML execution or attachment fetches.
  const content =
    text.length > 10000
      ? text.slice(0, 9900) + '\n[Message text truncated at the inbox limit.]'
      : text;
  return {
    workspaceId: input.workspaceId,
    channel: 'EMAIL',
    // From/Message-ID are untrusted headers, never evidence of a send receipt.
    direction: 'INBOUND',
    providerConnectionId: input.connectionId,
    providerMessageId: mailProviderId(physicalId),
    providerConversationId:
      mailThreadKey(
        parsed,
        input.ownAddresses ?? (input.ownAddress ? [input.ownAddress] : []),
      ) ?? mailProviderId(thread),
    contactHandle: sender,
    text: content || '[Email without a text body.]',
    occurredAt: Number.isFinite(date.getTime())
      ? date.toISOString()
      : new Date().toISOString(),
    subject: (parsed.subject ?? '').replace(/[\r\n\x00]/g, ' ').slice(0, 200),
    providerMetadata: {
      ...(input.mimeSha256 || input.source.length
        ? {
            mimeSha256:
              input.mimeSha256 ??
              createHash('sha256').update(input.source).digest('hex'),
          }
        : {}),
      ...(mailMessageId(parsed.messageId)
        ? { rfcMessageId: mailMessageId(parsed.messageId)! }
        : {}),
      ...(mailMessageId(parsed.inReplyTo)
        ? { inReplyTo: mailMessageId(parsed.inReplyTo)! }
        : {}),
      references: references
        .map(mailMessageId)
        .filter((value): value is string => value !== null)
        .slice(0, 3),
      mailbox: input.mailbox,
      uid: input.uid,
      uidValidity: input.uidValidity,
    },
  };
}
