import { gql } from '@apollo/client';

// See hermesInboxConversations for why this document is hand-written.
//
// `status` and `errorCode` are selected and shown with exactly the meaning the
// contract gives them: ACCEPTED is a provider receipt and never a delivery,
// and an unknown outcome stays UNCONFIRMED.
export const HERMES_INBOX_MESSAGES = gql`
  query HermesInboxMessages($input: HermesInboxMessagesInput!) {
    hermesInboxMessages(input: $input) {
      items {
        id
        conversationId
        channel
        direction
        text
        status
        occurredAt
        errorCode
        providerMessageId
      }
      nextCursor
    }
  }
`;
