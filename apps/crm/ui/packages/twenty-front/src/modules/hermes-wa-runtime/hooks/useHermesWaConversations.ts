import { MESSAGING_INBOX_CONVERSATIONS_PAGE_SIZE } from '@/messaging-inbox/constants/MessagingInboxContract';
import {
  type MessagingInboxCursorList,
  useMessagingInboxCursorList,
} from '@/messaging-inbox/hooks/useMessagingInboxCursorList';
import { type MessagingInboxConversation } from '@/messaging-inbox/types/MessagingInboxConversation';
import { readMessagingInboxConversationPage } from '@/messaging-inbox/utils/readMessagingInboxPayload';

import { HERMES_WA_CONVERSATIONS } from '@/hermes-wa-runtime/graphql/metadata-queries/hermesWaConversations';

// The WhatsApp conversation list.
//
// The cursor walker, the payload reader and the page size are the inbox's own,
// imported unchanged: a second implementation of "what is one page of
// conversations" would be a second answer to the same question, and the two
// would drift. What this hook adds is the channel, which is fixed to WHATSAPP
// because this surface is the WhatsApp one.
//
// There is no polling and no subscription. The first page loads on mount —
// a read, which emits nothing to any provider — and every further page or
// refresh comes from a button someone pressed.
export const useHermesWaConversations =
  (): MessagingInboxCursorList<MessagingInboxConversation> =>
    useMessagingInboxCursorList<MessagingInboxConversation>({
      query: HERMES_WA_CONVERSATIONS,
      responseField: 'hermesInboxConversations',
      buildVariables: (cursor) => ({
        input: {
          channel: 'WHATSAPP',
          limit: MESSAGING_INBOX_CONVERSATIONS_PAGE_SIZE,
          // Omitted rather than sent as null on the first page: the contract
          // marks the cursor optional, and an explicit null is a different
          // value from an absent field.
          ...(cursor === null ? {} : { cursor }),
        },
      }),
      readPage: readMessagingInboxConversationPage,
    });
