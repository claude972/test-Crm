import { gql } from '@apollo/client';

// The central connections, which are the authority on which mailbox this
// workspace is actually bound to.
//
// The MAIL entry carries the authorised `connectedAccountId`. Picking a native
// connected account any other way — the first one, the newest one — would
// offer a mailbox the server will refuse to send as the moment there is more
// than one account. Resolving this first and keeping only the matching native
// account is the whole point.
//
// Answers with a list of JSONObject, so there is no selection set to get wrong
// and the payload is reduced defensively on arrival.
export const HERMES_CONNECTIONS_V4 = gql`
  query HermesConnectionsV4 {
    hermesConnectionsV4
  }
`;
