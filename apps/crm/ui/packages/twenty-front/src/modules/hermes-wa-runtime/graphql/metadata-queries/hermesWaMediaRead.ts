import { gql } from '@apollo/client';

// Private read access to one media.
//
// A Query on the server, so it is run through the client's `query` with no
// cache: the answer is a path bound to a token with a sixty-second lifetime,
// and a cached one would be handed out after it had lapsed.
//
// The answer is a RELATIVE backend path plus an expiry. It is not an address a
// browser can put in a `src`: the route requires the current session, and the
// contract says a bare `<img src=downloadPath>` is insufficient. The bytes are
// fetched separately and wrapped in a revocable blob: URL.
//
// Nothing here is logged. The path is a short-lived credential in all but name.
export const HERMES_WA_MEDIA_READ = gql`
  query HermesWaMediaRead($input: HermesMediaScopeInput!) {
    hermesMediaRead(input: $input) {
      downloadPath
      expiresAt
    }
  }
`;
