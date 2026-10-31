import { gql } from '@apollo/client';

// Runs one read-only probe against the bound native mail account.
//
// A mutation although it stores nothing: it is a command the operator issues
// by pressing a button, it must never be served from a cache, and it must
// never be replayed by a transport retry. A query would be cached and
// refetched, turning one deliberate diagnostic into repeated provider traffic.
//
// What the server does for each probe, and nothing besides:
//   IMAP_LIST_STATUS — open the session, LIST the folders, read the bound
//     folder's counters. Nothing is fetched, flagged, moved, appended or
//     deleted, so an unread message stays unread.
//   SMTP_LOGIN_ONLY — greeting, TLS, authentication, then close. No MAIL FROM,
//     no RCPT TO, no DATA: no mail can leave.
//
// The two directions are asked for one at a time, because a mailbox that
// receives is not a mailbox that sends.
//
// The field is `JSONObject`, a scalar, so it carries no sub-selection. The
// answer is `{kind, probe, outcome, checkedAt, connectionId, revision,
// observations, errorCode, emitted}`. `outcome` is the server's own verdict —
// NOT_CONFIGURED, REACHABLE, UNREACHABLE or CONNECTION_CHANGED — and a
// successful probe promotes no state: the store still publishes only
// NOT_CONFIGURED and CONFIGURED_UNVERIFIED, so nothing here is « connecté ».
export const HERMES_TEST_MAIL_CONNECTION_V4 = gql`
  mutation HermesTestMailConnectionV4($input: HermesMailConnectionTestInput!) {
    hermesTestMailConnectionV4(input: $input)
  }
`;
