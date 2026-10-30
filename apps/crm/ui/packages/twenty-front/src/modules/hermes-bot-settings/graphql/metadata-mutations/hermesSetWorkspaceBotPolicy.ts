import { gql } from '@apollo/client';

// Sets the policy of one scope: the company as a whole, or one channel.
//
// `expectedRevision` is mandatory. It is what lets the server refuse a write
// built on a policy that has since changed, instead of silently overwriting
// someone else's decision — so this screen never sends a write without the
// revision it actually read.
//
// The answer is authoritative: it carries the mode the server settled on,
// which is not necessarily the one that was asked for.
export const HERMES_SET_WORKSPACE_BOT_POLICY = gql`
  mutation HermesSetWorkspaceBotPolicy(
    $input: HermesSetWorkspaceBotPolicyInput!
  ) {
    hermesSetWorkspaceBotPolicy(input: $input) {
      scope
      mode
      revision
    }
  }
`;
