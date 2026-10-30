import { gql } from '@apollo/client';

export const HERMES_QUALIFY_IMPORT_ROWS = gql`
  mutation HermesQualifyImportRows($input: HermesQualifyImportRowsInput!) {
    hermesQualifyImportRows(input: $input)
  }
`;
