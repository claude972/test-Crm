import { gql } from '@apollo/client';

// Writes one connection of the session's operating company.
//
// `expectedRevision` is mandatory and is an Int. It is what lets the server
// refuse a write built on a configuration that has since changed instead of
// silently overwriting someone else's decision — so nothing is ever sent from
// here without a revision that was actually read. A stale write fails
// CONNECTION_REVISION_CONFLICT and is never retried automatically.
//
// `secrets` is omitted entirely to keep the stored secrets as they are.
// Supplying the object replaces the COMPLETE secret set for that identity, so
// a partial secret object would wipe the fields it leaves out. A blank string
// is invalid input, never « keep the old value ».
export const HERMES_SAVE_CONNECTION_V4 = gql`
  mutation HermesSaveConnectionV4($input: HermesConnectionSaveInput!) {
    hermesSaveConnectionV4(input: $input)
  }
`;
