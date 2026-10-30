import { MESSAGING_INBOX_CONVERSATIONS_PAGE_SIZE } from '@/messaging-inbox/constants/MessagingInboxContract';
import { HERMES_INBOX_CONVERSATIONS } from '@/messaging-inbox/graphql/metadata-queries/hermesInboxConversations';
import {
  type MessagingInboxCursorList,
  useMessagingInboxCursorList,
} from '@/messaging-inbox/hooks/useMessagingInboxCursorList';
import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';
import { readMessagingInboxConversationPage } from '@/messaging-inbox/utils/readMessagingInboxPayload';

// The conversation list for one channel. `channel` is the only filter the
// contract publishes, and it is exactly what the two tabs select.
//
// No workspace id is sent: the resolver derives it from the session.
export const useMessagingInboxConversations = (
  channel: MessagingInboxChannel,
): MessagingInboxCursorList<MessagingInboxConversation> =>
  useMessagingInboxCursorList<MessagingInboxConversation>({
    query: HERMES_INBOX_CONVERSATIONS,
    responseField: 'hermesInboxConversations',
    buildVariables: (cursor) => ({
      input: {
        channel,
        limit: MESSAGING_INBOX_CONVERSATIONS_PAGE_SIZE,
        // Omitted rather than sent as null on the first page: the contract
        // marks the cursor optional and an explicit null is a different value
        // from an absent field.
        ...(cursor === null ? {} : { cursor }),
      },
    }),
    readPage: readMessagingInboxConversationPage,
  });
