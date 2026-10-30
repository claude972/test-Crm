import { gql } from '@apollo/client';

// The WhatsApp conversation list.
//
// Hand-written, like every other inbox document in this repository: these
// operations are absent from ~/generated-metadata/graphql, so nothing can be
// generated from the schema yet. A deployment that does not expose the
// operation answers with an error and the screen says the list is unavailable
// — never that it is empty.
//
// No workspace id travels from the browser. The resolver derives workspace,
// user and membership from the authenticated session, and the contract states
// none of the three is accepted in an input.
//
// The selection set is deliberately identical to the one the inbox already
// ships, field for field. Asking for a field the deployed schema lacks fails
// validation for the WHOLE query, and this list is how the screen gets its
// conversations: a field nothing on screen needs is not worth taking the list
// down for.
//
// `personId` and `personMatchStatus` are what the CRM inspector reads. Both are
// read-only here: the server owns the attachment, and this client never writes
// one.
export const HERMES_WA_CONVERSATIONS = gql`
  query HermesWaConversations($input: HermesInboxConversationsInput) {
    hermesInboxConversations(input: $input) {
      items {
        id
        channel
        providerConnectionId
        contactHandle
        personId
        personMatchStatus
        subject
        lastMessageAt
        botMode
        botModeUpdatedAt
      }
      nextCursor
    }
  }
`;
