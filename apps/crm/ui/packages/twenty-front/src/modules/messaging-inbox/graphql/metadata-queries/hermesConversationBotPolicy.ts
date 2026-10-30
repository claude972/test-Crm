import { gql } from '@apollo/client';

// The effective bot policy of one conversation.
//
// `mode`, `reason` and `revision` are Strings on the wire, not GraphQL enums,
// so an unknown value reaches the screen intact instead of breaking the read.
//
// The server computes `effectiveMode` as the most restrictive of the workspace
// or channel policy and the conversation's own exception. The browser never
// recomputes it: a local guess would be a second policy.
export const HERMES_CONVERSATION_BOT_POLICY = gql`
  query HermesConversationBotPolicy($input: HermesConversationBotPolicyInput!) {
    hermesConversationBotPolicy(input: $input) {
      conversationId
      localMode
      effectiveMode
      reason
      revision
      canDraft
      canAutoReply
    }
  }
`;
