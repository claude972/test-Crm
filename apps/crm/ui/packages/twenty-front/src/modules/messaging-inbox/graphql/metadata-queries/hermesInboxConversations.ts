import { gql } from '@apollo/client';

// Written from the published inbox contract rather than imported from
// ~/generated-metadata/graphql: the inbox operations are absent from the
// generated schema, so nothing can be generated from it yet. A deployment that
// does not expose the operation answers with an error, and the screen shows an
// unavailable inbox — never an empty one.
//
// No workspace id travels from the browser: the resolver derives it from the
// authenticated session.
//
// The input is nullable in the contract, so the variable is declared nullable
// too and this client always sends one anyway, because the two tabs ARE the
// channel filter.
//
// Deliberately NOT selected: botMode, botOwnerUserWorkspaceId and
// botModeUpdatedAt. They belong to the bot delegation schema checkpoint whose
// runtime is still pending, and a selection set that names a field the
// deployed schema lacks fails validation for the WHOLE query — the inbox would
// go dark over a field nothing on screen needs yet. The payload reader already
// accepts them, so adding the three lines here is the only change needed once
// the fields are confirmed deployed.
export const HERMES_INBOX_CONVERSATIONS = gql`
  query HermesInboxConversations($input: HermesInboxConversationsInput) {
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
