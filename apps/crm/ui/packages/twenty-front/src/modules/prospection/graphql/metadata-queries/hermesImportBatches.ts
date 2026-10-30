import { gql } from '@apollo/client';

// Written from the published contract rather than imported from
// ~/generated-metadata/graphql: the four Hermes operations are implemented but
// their migration is still going through CI, so the generated schema does not
// carry them yet. The operation returns GraphQLJSONObject, hence no selection
// set and a defensive read on the client.
//
// No workspace id travels from the browser: the resolver derives it from the
// authenticated session.
export const HERMES_IMPORT_BATCHES = gql`
  query HermesImportBatches {
    hermesImportBatches
  }
`;
