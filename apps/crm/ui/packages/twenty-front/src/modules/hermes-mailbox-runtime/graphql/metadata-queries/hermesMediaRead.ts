import { gql } from '@apollo/client';

// The private read for one imported attachment.
//
// Unlike the mail operations this one answers with a typed object, so it does
// carry a selection set. `downloadPath` is relative, needs the session the
// browser already holds, and expires quickly: the bytes are fetched once and
// turned into a blob URL, which is revoked when the message closes.
export const HERMES_MEDIA_READ = gql`
  query HermesMediaRead($input: HermesMediaScopeInput!) {
    hermesMediaRead(input: $input) {
      downloadPath
      expiresAt
    }
  }
`;
