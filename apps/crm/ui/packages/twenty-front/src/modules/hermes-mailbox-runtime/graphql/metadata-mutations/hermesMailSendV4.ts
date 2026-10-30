import { gql } from '@apollo/client';

// The one emission on this screen.
//
// `clientRequestId` is required, is minted once per attempt, and is kept after
// an uncertain outcome: the contract forbids a new identifier and forbids a
// blind retry, because the reservation it already made is what stops a second
// copy reaching the recipient.
export const HERMES_MAIL_SEND_V4 = gql`
  mutation HermesMailSendV4($input: HermesMailComposeInput!) {
    hermesMailSendV4(input: $input)
  }
`;
