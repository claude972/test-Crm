import { gql } from '@apollo/client';

// Sending a message that answers nothing.
//
// Two identifiers travel, and they are not the same thing: `draftId` is the
// draft's stable identity, `clientRequestId` is this one immutable send
// attempt. After an uncertain outcome the attempt is replayed under the very
// same `clientRequestId` with unchanged content — never a new id, and never a
// retry started by the client.
export const HERMES_MAIL_SEND_NEW_V4 = gql`
  mutation HermesMailSendNewV4($input: HermesMailNewDraftInput!) {
    hermesMailSendNewV4(input: $input)
  }
`;
