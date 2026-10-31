import { gql } from '@apollo/client';

// One read-only probe against the bound native mail account. A mutation
// although it stores nothing: a command must not be cached or replayed by a
// transport retry. IMAP lists folders and reads counters; SMTP stops after
// authentication, with no MAIL FROM, RCPT TO or DATA. The answer is a
// JSONObject whose `outcome` is the server's verdict, and never « connecté ».
export const HERMES_TEST_MAIL_CONNECTION_V4 = gql`
  mutation HermesTestMailConnectionV4($input: HermesMailConnectionTestInput!) {
    hermesTestMailConnectionV4(input: $input)
  }
`;
