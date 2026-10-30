import { gql } from '@apollo/client';

// Planning an answer.
//
// The contract gives recipient planning to the server: it re-parses the
// original MIME and applies the Reply-To preference, the case-insensitive
// exclusion of our own addresses, the deduplication across To/Cc/Bcc, the rule
// that a received Bcc is never copied, and the rule that a forward leaves with
// no reply references. It returns `{state:'PLANNED',envelope,conversationId}`
// and emits nothing.
//
// It is a Mutation on the server even though it sends no mail, because a
// forward reserves a canonical draft conversation while planning.
export const HERMES_MAIL_PLAN_V4 = gql`
  mutation HermesMailPlanV4($input: HermesMailComposeInput!) {
    hermesMailPlanV4(input: $input)
  }
`;
