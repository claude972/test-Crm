import { gql } from '@apollo/client';

// Removes one connection of the session's operating company.
//
// Removal revokes the configuration, deletes the encrypted payload and keeps a
// monotone revision tombstone: recreating afterwards needs that tombstone
// revision, not 0, and generates a new connection id. It carries the same
// mandatory `expectedRevision` as the save, and the contract states plainly
// that the UI must not retry a stale mutation on its own.
export const HERMES_REMOVE_CONNECTION_V4 = gql`
  mutation HermesRemoveConnectionV4($input: HermesConnectionScopeInput!) {
    hermesRemoveConnectionV4(input: $input)
  }
`;
