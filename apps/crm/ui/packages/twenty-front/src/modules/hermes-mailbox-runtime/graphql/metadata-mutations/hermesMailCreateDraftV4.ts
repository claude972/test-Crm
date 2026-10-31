import { gql } from '@apollo/client';

// Saving a message that answers nothing.
//
// `draftId` is the stable identity: the server derives the native Message-ID
// and the canonical conversation from it, so it is minted once per composition
// and never regenerated. `draftRevision` is opaque and is sent back exactly as
// it arrived, which is what makes the save a compare-and-swap instead of a
// blind append.
export const HERMES_MAIL_CREATE_DRAFT_V4 = gql`
  mutation HermesMailCreateDraftV4($input: HermesMailNewDraftInput!) {
    hermesMailCreateDraftV4(input: $input)
  }
`;
