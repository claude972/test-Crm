import { gql } from '@apollo/client';

// See hermesMailFoldersV4 for why this document is hand-written.
//
// The scope is the triple the contract requires: the folder, the message UID
// as a String — IMAP UIDs overflow a GraphQL Int — and the UIDVALIDITY the
// list was read under. A validity that no longer matches the selected mailbox
// answers MAIL_UID_VALIDITY_CHANGED, which is an explicit error and never an
// empty message.
export const HERMES_MAIL_MESSAGE_V4 = gql`
  query HermesMailMessageV4($input: HermesMailMessageInput!) {
    hermesMailMessageV4(input: $input)
  }
`;
