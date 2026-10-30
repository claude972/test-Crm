import { MESSAGING_INBOX_MESSAGES_PAGE_SIZE } from '@/messaging-inbox/constants/MessagingInboxContract';
import { HERMES_INBOX_MESSAGES } from '@/messaging-inbox/graphql/metadata-queries/hermesInboxMessages';
import {
  type MessagingInboxCursorList,
  useMessagingInboxCursorList,
} from '@/messaging-inbox/hooks/useMessagingInboxCursorList';
import { type MessagingInboxMessage } from '@/messaging-inbox/types/MessagingInboxMessage';
import { readMessagingInboxMessagePage } from '@/messaging-inbox/utils/readMessagingInboxPayload';

// The messages of one conversation.
//
// The items are rendered in the order the server returned them. The contract
// does not publish an ordering, so re-sorting them here would assert one —
// and would move every message whose timestamp this client cannot read.
export const useMessagingInboxMessages = (
  conversationId: string,
): MessagingInboxCursorList<MessagingInboxMessage> =>
  useMessagingInboxCursorList<MessagingInboxMessage>({
    query: HERMES_INBOX_MESSAGES,
    responseField: 'hermesInboxMessages',
    buildVariables: (cursor) => ({
      input: {
        conversationId,
        limit: MESSAGING_INBOX_MESSAGES_PAGE_SIZE,
        ...(cursor === null ? {} : { cursor }),
      },
    }),
    readPage: readMessagingInboxMessagePage,
  });
