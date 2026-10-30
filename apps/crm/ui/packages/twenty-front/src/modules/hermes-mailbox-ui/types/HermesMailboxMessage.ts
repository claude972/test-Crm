import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import {
  type HermesMailboxBody,
  type HermesMailboxQuote,
} from '@/hermes-mailbox-ui/types/HermesMailboxBody';

// One message inside a thread.
//
// `isOutbound` is the provider's own answer, not something inferred from the
// author matching the local mailbox: a shared mailbox can receive mail from a
// colleague whose address is also ours. `null` leaves the direction unknown,
// and the card writes that out rather than picking a side.
//
// `isUnsentDraft` marks a message that exists only as a draft. It is a
// separate fact from the direction: a draft was never emitted, and the card
// says so in words so no one reads it as a sent reply.
export type HermesMailboxMessage = {
  // A string. IMAP identifiers overflow a GraphQL integer, so no identifier in
  // this module is ever a number.
  id: string;
  author: HermesMailboxAddress | null;
  occurredAt: string | null;
  isOutbound: boolean | null;
  isUnsentDraft: boolean;
  body: HermesMailboxBody | null;
  quote: HermesMailboxQuote | null;
  attachments: HermesMailboxAttachment[];
};
