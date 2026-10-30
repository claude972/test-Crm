import { gql } from '@apollo/client';

export const HERMES_CREATE_IMPORT_BATCH = gql`
  mutation HermesCreateImportBatch($input: HermesCreateImportBatchInput!) {
    hermesCreateImportBatch(input: $input)
  }
`;
