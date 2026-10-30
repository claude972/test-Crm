import { gql } from '@apollo/client';

// The central connections of the session's operating company.
//
// Argument-free by contract: the server resolves the connections of the
// authenticated session's workspace. Sending a workspace id from the browser
// would let this screen ask about a workspace it has no right to.
//
// The field is `[JSONObject!]!`, a scalar, so it carries no sub-selection. One
// view comes back per published kind — EVOLUTION, MAIL, MCP, INTAKE — each
// shaped `{kind, connectionId, revision, state, settings, secretFields,
// updatedAt}`.
//
// What the server never sends, and what this screen therefore never shows:
// no secret value, no ciphertext, no secret suffix. `secretFields` carries
// field NAMES only. The published states are NOT_CONFIGURED and
// CONFIGURED_UNVERIFIED: configuration presence is not a connection test, so
// nothing read here can be presented as connected.
export const HERMES_CONNECTIONS_V4 = gql`
  query HermesConnectionsV4 {
    hermesConnectionsV4
  }
`;
