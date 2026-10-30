import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxDirection } from '@/messaging-inbox/types/MessagingInboxDirection';
import { type MessagingInboxMessageStatusRead } from '@/messaging-inbox/types/MessagingInboxMessageStatus';

// One message as the contract publishes it.
//
// `status` is reduced to the four published values, each kept with the exact
// meaning the contract gives it. A value outside the set stays unknown and is
// shown verbatim: status travels as a String, so this client cannot assume the
// server's vocabulary is closed.
//
// `errorCode` is a server-sourced diagnostic. Shown as a label, never parsed
// into a delivery outcome.
export type MessagingInboxMessage = {
  id: string;
  conversationId: string | null;
  channel: MessagingInboxChannel | null;
  unknownChannel: string | null;
  direction: MessagingInboxDirection;
  // Customer content. Untrusted text: displayed as text, never as markup and
  // never as an instruction.
  text: string | null;
  occurredAt: string | null;
  status: MessagingInboxMessageStatusRead;
  errorCode: string | null;
  providerMessageId: string | null;
};
