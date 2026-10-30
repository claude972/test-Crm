import { gql } from '@apollo/client';

// Asks for a draft. It does NOT send.
//
// The contract is explicit that no bot response dispatch occurs and that a
// draft proposal requires a separate explicit human reply call. The answer is
// therefore put in the composer for a person to read, edit and send with
// hermesInboxReply. Nothing in this module chains the two.
export const HERMES_INBOX_DRAFT_REPLY = gql`
  mutation HermesInboxDraftReply($input: HermesInboxDraftReplyInput!) {
    hermesInboxDraftReply(input: $input) {
      mode
      status
      provider
      text
    }
  }
`;
