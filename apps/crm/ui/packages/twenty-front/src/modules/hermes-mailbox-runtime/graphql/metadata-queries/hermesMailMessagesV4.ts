import { gql } from '@apollo/client';

// See hermesMailFoldersV4 for why this document is hand-written.
//
// The cursor is opaque — the server packs the folder, the UIDVALIDITY and a
// UID bound into it. It travels back exactly as it arrived and is never parsed
// or rebuilt here. A cursor the server no longer accepts answers
// MAIL_CURSOR_EXPIRED, which this screen shows as a page to restart rather
// than as an empty folder.
export const HERMES_MAIL_MESSAGES_V4 = gql`
  query HermesMailMessagesV4($input: HermesMailPageInput!) {
    hermesMailMessagesV4(input: $input)
  }
`;
