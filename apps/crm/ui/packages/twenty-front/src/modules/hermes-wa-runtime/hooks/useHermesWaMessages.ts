import { MESSAGING_INBOX_MESSAGES_PAGE_SIZE } from '@/messaging-inbox/constants/MessagingInboxContract';
import {
  type MessagingInboxCursorList,
  useMessagingInboxCursorList,
} from '@/messaging-inbox/hooks/useMessagingInboxCursorList';

import { HERMES_WA_MESSAGES_V3 } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaMessagesV3';
import { type HermesWaRuntimeMessage } from '@/hermes-wa-runtime/types/HermesWaRuntimeMessage';
import { readHermesWaRuntimeMessagePage } from '@/hermes-wa-runtime/utils/readHermesWaRuntimePayload';

// One conversation's messages, read through V3 so the attachments arrive typed.
//
// V3 is used whenever it exists, and "exists" is the deployment's answer, not a
// guess: a deployment without the operation answers with an error and the
// cursor walker reports the thread as unreadable. It does NOT silently fall
// back to V1 — a thread rendered from V1 would be a thread with every
// attachment quietly missing, which looks exactly like a thread that had none.
//
// The items are rendered in the order the server returned them. The contract
// publishes no ordering, so re-sorting here would assert one, and would move
// every message whose timestamp this client cannot read.
//
// Mounted under a key tied to the conversation id, so opening another thread
// starts a clean read instead of merging two histories.
export const useHermesWaMessages = (
  conversationId: string,
): MessagingInboxCursorList<HermesWaRuntimeMessage> =>
  useMessagingInboxCursorList<HermesWaRuntimeMessage>({
    query: HERMES_WA_MESSAGES_V3,
    responseField: 'hermesInboxMessagesV3',
    buildVariables: (cursor) => ({
      input: {
        conversationId,
        limit: MESSAGING_INBOX_MESSAGES_PAGE_SIZE,
        ...(cursor === null ? {} : { cursor }),
      },
    }),
    readPage: readHermesWaRuntimeMessagePage,
  });
