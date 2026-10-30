import { gql } from '@apollo/client';

// Pulls e-mail into the inbox, once, when an operator asks for it.
//
// No input and no selection set: the operation takes no argument and answers
// with an untyped JSON object, so the payload is reduced defensively on the
// client and an answer whose shape does not match becomes unknown.
//
// The existing encrypted native IMAP/SMTP accounts are reused. No secret
// travels through the browser, and setting an account up happens on the native
// e-mail settings page, not here.
export const HERMES_INBOX_SYNC_EMAIL = gql`
  mutation HermesInboxSyncEmail {
    hermesInboxSyncEmail
  }
`;
