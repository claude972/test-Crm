import { type MessagingInboxMessage } from '@/messaging-inbox/types/MessagingInboxMessage';
import { type MessagingInboxPayloadProblem } from '@/messaging-inbox/types/MessagingInboxPage';
import { type MessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

// The three send states the integration contract requires, kept apart by
// construction, plus the two ways an attempt can end badly.
//
// - 'draft': a reply proposed locally. Nothing left the browser.
// - 'requested': the mutation is in flight. The workspace asked; no transport
//   has acknowledged anything.
// - 'accepted': the server answered with a message. What the transport did
//   with it is whatever that message's own `status` says — this state alone
//   never means delivered.
//
// 'unreadable' and 'failed' are deliberately not folded into 'draft': the
// request did leave, so re-sending it under a new idempotency key could
// duplicate the message.
export type MessagingInboxSendState =
  | { kind: 'draft' }
  | { kind: 'requested'; clientRequestId: string }
  | {
      kind: 'accepted';
      clientRequestId: string;
      message: MessagingInboxMessage;
    }
  | {
      kind: 'unreadable';
      clientRequestId: string;
      problem: MessagingInboxPayloadProblem;
    }
  | {
      kind: 'failed';
      clientRequestId: string;
      failure: MessagingInboxCallFailure;
    };
