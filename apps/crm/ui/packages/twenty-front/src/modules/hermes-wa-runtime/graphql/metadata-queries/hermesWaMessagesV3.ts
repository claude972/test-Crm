import { gql } from '@apollo/client';

// One conversation's messages, V3.
//
// V3 is the version with typed attachments: every message additionally carries
// `kind: String!` and `attachments: [HermesMediaAsset!]!`, and the contract
// states a received image, video or audio may have empty text. The V1 names and
// the required text replies stay compatible, so the rest of the selection set
// is exactly V1's.
//
// Fields are named explicitly, as the contract asks. `size` and `status` keep
// the server's own words: a status outside PENDING / READY / ATTACHED /
// REVOKED is kept verbatim by the reader and never guessed into one.
//
// No file storage id, no key, no provider URL and no base64 is selected —
// the contract states none exists to select.
export const HERMES_WA_MESSAGES_V3 = gql`
  query HermesWaMessagesV3($input: HermesInboxMessagesInput!) {
    hermesInboxMessagesV3(input: $input) {
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
        kind
        attachments {
          id
          kind
          filename
          mimeType
          size
          status
        }
      }
      nextCursor
    }
  }
`;
