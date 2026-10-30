import { type MessagingInboxMessage } from '@/messaging-inbox/types/MessagingInboxMessage';

import { type HermesWaRuntimeAsset } from '@/hermes-wa-runtime/types/HermesWaRuntimeAsset';

// The four message kinds `hermesInboxReplyV3` accepts and `hermesInboxMessagesV3`
// reports. They are NOT the library's media kinds: the wire says AUDIO where
// the library's renderer says VOICE, so the two vocabularies are kept apart and
// mapped explicitly rather than passed through.
export const HERMES_WA_MESSAGE_KINDS = [
  'TEXT',
  'IMAGE',
  'VIDEO',
  'AUDIO',
] as const;

export type HermesWaMessageKind = (typeof HERMES_WA_MESSAGE_KINDS)[number];

export const isHermesWaMessageKind = (
  value: unknown,
): value is HermesWaMessageKind =>
  typeof value === 'string' &&
  (HERMES_WA_MESSAGE_KINDS as readonly string[]).includes(value);

// `kind` is a String on the wire, so a value outside the four stays unknown and
// keeps the server's own word. An unknown kind never picks a renderer.
export type HermesWaMessageKindRead =
  | { kind: 'known'; messageKind: HermesWaMessageKind }
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaMessageKind = (
  value: unknown,
): HermesWaMessageKindRead => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (isHermesWaMessageKind(normalised)) {
    return { kind: 'known', messageKind: normalised };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};

// One `HermesInboxMessageV3`.
//
// The V3 object extends the V1 one, so the V1 half is read by the inbox's own
// reader and kept whole under `base` instead of being copied field by field:
// one reader, one meaning for `status` and `errorCode`.
//
// `attachments` is non-null in the contract. An answer that omits it, or sends
// something that is not a list, reads as an empty list of attachments — which
// is a real case the contract names, since a received image may have no text
// and a text message has no attachment.
export type HermesWaRuntimeMessage = {
  base: MessagingInboxMessage;
  kind: HermesWaMessageKindRead;
  attachments: HermesWaRuntimeAsset[];
  // Attachments that arrived without a readable id, counted rather than
  // hidden: an asset with no id cannot be read back, so it is not rendered as
  // a half-entry.
  unreadableAttachmentCount: number;
};
