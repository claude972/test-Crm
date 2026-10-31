import { gql } from '@apollo/client';

// Carrying one attachment from the thread being forwarded into the forward's
// own conversation.
//
// The contract is explicit that a send never silently reuses a source thread's
// assets: each file is cloned explicitly, both scopes are re-authorised
// server-side, and the returned target asset id is what the send may reference.
export const HERMES_MAIL_CLONE_ATTACHMENT_V4 = gql`
  mutation HermesMailCloneAttachmentV4(
    $input: HermesMailCloneAttachmentInput!
  ) {
    hermesMailCloneAttachmentV4(input: $input)
  }
`;
