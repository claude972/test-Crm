import { createHash } from 'node:crypto';
import { v5 } from 'uuid';
import { z } from 'zod';
import { type HermesMessagingChannel } from 'src/engine/core-modules/hermes-messaging/types/hermes-messaging.types';

const NAMESPACE = '4f8f0b03-6a14-4812-a72f-53e29d438441';
export const messagingId = (...parts: string[]): string =>
  v5(JSON.stringify(parts), NAMESPACE);
export const messagingDigest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identifier = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[\x21-\x7e]+$/);
export const messagingText = z
  .string()
  .min(1)
  .max(20_000)
  .refine((value) => !value.includes('\0') && value.trim().length > 0);
const metadataHeader = z
  .string()
  .max(998)
  .refine(
    (value) =>
      !/[\r\n\0]/.test(value) && Buffer.byteLength(value, 'utf8') <= 998,
  );
const providerMetadataSchema = z
  .object({
    rfcMessageId: metadataHeader.optional(),
    sentCopyState: z.enum(['PENDING', 'UNCONFIRMED', 'SAVED']).optional(),
    mimeSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    inReplyTo: metadataHeader.optional(),
    references: z.array(metadataHeader).max(20).optional(),
    mailbox: z
      .string()
      .min(1)
      .max(256)
      .refine((value) => !/[\r\n\0]/.test(value))
      .optional(),
    uidValidity: z
      .union([
        z.string().regex(/^[1-9]\d{0,19}$/),
        z.number().int().min(1).max(4294967295).transform(String),
      ])
      .optional(),
    uid: z.number().int().min(1).max(4294967295).optional(),
  })
  .strict()
  .refine(
    (value) => Buffer.byteLength(JSON.stringify(value), 'utf8') <= 16_384,
  );
export const messagingEventSchema = z
  .object({
    workspaceId: z.string().uuid(),
    channel: z.enum(['WHATSAPP', 'EMAIL']),
    direction: z.enum(['INBOUND', 'OUTBOUND']),
    providerConnectionId: identifier,
    providerMessageId: identifier,
    providerConversationId: identifier,
    contactHandle: z
      .string()
      .min(1)
      .max(512)
      .refine((value) => !/[\x00-\x20\x7f]/.test(value)),
    text: z
      .string()
      .max(20_000)
      .refine((value) => !value.includes('\0')),
    kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'EMAIL']).optional(),
    attachmentIds: z.array(z.string().uuid()).max(10).optional(),
    mediaAssetId: z.string().uuid().optional(),
    occurredAt: z.string().datetime({ offset: true }),
    subject: z.string().max(512).optional(),
    providerMetadata: providerMetadataSchema.optional(),
  })
  .strict()
  .refine((event) => {
    if (event.kind === 'EMAIL')
      return event.channel === 'EMAIL' && !event.mediaAssetId;
    if (event.kind)
      return (
        event.channel === 'WHATSAPP' &&
        (!!event.mediaAssetId || event.attachmentIds?.length === 1) &&
        (!event.attachmentIds ||
          (event.attachmentIds.length === 1 &&
            (!event.mediaAssetId ||
              event.mediaAssetId === event.attachmentIds[0])))
      );
    return (
      !event.attachmentIds?.length &&
      !event.mediaAssetId &&
      messagingText.safeParse(event.text).success
    );
  });
export const normalizeContactHandle = (
  channel: HermesMessagingChannel,
  value: string,
): string => {
  if (channel === 'EMAIL')
    return z.string().email().max(254).parse(value.trim().toLowerCase());
  return z
    .string()
    .regex(/^\d{5,20}@(s\.whatsapp\.net|g\.us|lid)$/)
    .parse(value);
};
export const pageLimit = (
  value: number | undefined,
  fallback: number,
): number =>
  z
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(value ?? fallback);
export const encodeMessagingCursor = (at: Date, id: string): string =>
  Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString(
    'base64url',
  );
export const decodeMessagingCursor = (
  value?: string,
): { at: Date; id: string } | null => {
  if (!value) return null;
  if (value.length > 256 || !/^[a-zA-Z0-9_-]+$/.test(value))
    throw new Error('INVALID_CURSOR');
  const parsed = z
    .object({ at: z.string().datetime(), id: z.string().uuid() })
    .strict()
    .parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
  return { at: new Date(parsed.at), id: parsed.id };
};
