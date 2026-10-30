import { gql } from '@apollo/client';

// Saving an answer to the provider's own Drafts folder. No SMTP call, and the
// contract is explicit that a missing provider Drafts folder fails rather than
// reporting a save that did not happen.
export const HERMES_MAIL_SAVE_DRAFT_V4 = gql`
  mutation HermesMailSaveDraftV4($input: HermesMailComposeInput!) {
    hermesMailSaveDraftV4(input: $input)
  }
`;
