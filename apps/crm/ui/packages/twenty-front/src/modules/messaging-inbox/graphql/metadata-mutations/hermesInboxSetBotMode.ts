import { gql } from '@apollo/client';

// Per-conversation delegation. The input carries the conversation and the
// requested mode and nothing else: the contract is explicit that no caller may
// supply a bot owner id, which the server resolves from the session.
//
// The answer is authoritative. Asking for AUTO does not make it AUTO: when the
// readonly MCP check finds no usable configuration the server leaves the
// conversation MANUAL and says why in `status`. The screen reads `mode` back
// rather than assuming the request succeeded.
export const HERMES_INBOX_SET_BOT_MODE = gql`
  mutation HermesInboxSetBotMode($input: HermesInboxSetBotModeInput!) {
    hermesInboxSetBotMode(input: $input) {
      conversationId
      mode
      status
    }
  }
`;
