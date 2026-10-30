import { gql } from '@apollo/client';

// Hand-written from the published V4 mail contract rather than imported from
// ~/generated-metadata/graphql: the mail operations are absent from the
// generated schema, so nothing can be generated from it yet. A deployment that
// does not expose the operation answers with an error, and the mailbox reports
// an unavailable read — never an empty one.
//
// The payload is a JSONObject, so there is no selection set to get wrong and
// no field name that can take the whole query down. Everything is reduced
// defensively on arrival instead.
//
// Argument-free by contract: workspace, user and membership all come from the
// authenticated session.
export const HERMES_MAIL_FOLDERS_V4 = gql`
  query HermesMailFoldersV4 {
    hermesMailFoldersV4
  }
`;
