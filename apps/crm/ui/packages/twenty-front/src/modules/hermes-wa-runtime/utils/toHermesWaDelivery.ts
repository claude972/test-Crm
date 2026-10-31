import { type MessagingInboxMessageStatusRead } from '@/messaging-inbox/types/MessagingInboxMessageStatus';

import {
  type HermesWaDelivery,
  type HermesWaDeliveryStateRead,
} from '@/hermes-wa-ui/types/HermesWaDelivery';

// The inbox's status read as the library's delivery read, mapped once.
//
// Why this exists rather than calling the library's own string reader on the
// raw value: the two readers normalise differently. The inbox matches the four
// names exactly, the library uppercases first. So a status the inbox already
// REJECTED as unrecognised — `received` in lower case, say — was being handed
// to the library, uppercased, recognised, and rendered as "Received": a state
// the authority never confirmed, shown as a settled one.
//
// Here a known status is carried across by name and an unknown one stays
// unknown with the server's own word. The four names are identical in both
// vocabularies, so nothing is translated and nothing is re-parsed.
export const toHermesWaDeliveryState = (
  status: MessagingInboxMessageStatusRead,
): HermesWaDeliveryStateRead =>
  status.kind === 'known'
    ? { kind: 'known', state: status.status }
    : { kind: 'unknown', raw: status.raw };

export const toHermesWaDelivery = (
  status: MessagingInboxMessageStatusRead,
  errorCode: string | null,
): HermesWaDelivery => ({
  state: toHermesWaDeliveryState(status),
  errorCode,
});
