import { gql } from '@apollo/client';

// The bot policy of the company and of each channel.
//
// Argument-free by contract: the server resolves the policies of the session's
// workspace. Sending a workspace id from the browser would let the screen ask
// about a workspace it has no right to.
//
// `scope`, `mode` and `revision` are Strings on the wire, not GraphQL enums,
// so an unknown value reaches the screen intact instead of breaking the read.
export const HERMES_WORKSPACE_BOT_POLICIES = gql`
  query HermesWorkspaceBotPolicies {
    hermesWorkspaceBotPolicies {
      scope
      mode
      revision
    }
  }
`;
