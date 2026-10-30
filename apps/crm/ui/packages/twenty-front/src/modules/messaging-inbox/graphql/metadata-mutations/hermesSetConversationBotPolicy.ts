import { gql } from '@apollo/client';

// Sets the conversation's own exception.
//
// `expectedRevision` is mandatory: it is what lets the server refuse a write
// built on a policy that has since changed, rather than silently overwriting
// someone else's decision.
//
// `delegateAuto` is only ever sent when the operator explicitly asks for an
// automatic reply, because the contract requires an explicit delegation for
// that one transition and for nothing else.
export const HERMES_SET_CONVERSATION_BOT_POLICY = gql`
  mutation HermesSetConversationBotPolicy(
    $input: HermesSetConversationBotPolicyInput!
  ) {
    hermesSetConversationBotPolicy(input: $input) {
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
