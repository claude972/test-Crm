import { gql } from '@apollo/client';

// The configuration state of each ingested shared connection.
//
// Argument-free by contract: the server resolves the connections the session's
// workspace may see. Sending a channel or a connection id from the browser
// would let the screen ask about a connection it has no right to.
//
// This beta exposes only explicitly ingested shared connections. It never
// discovers or lists private native mailboxes, so an absent channel here means
// nothing is set up — not that a private mailbox is hiding.
export const HERMES_MESSAGING_CONNECTIONS = gql`
  query HermesMessagingConnections {
    hermesMessagingConnections {
      channel
      state
      canSend
      canSync
      canSendMedia
      canReceiveMedia
      canRecordVoice
      canComposeRichEmail
      lastCheckedAt
      errorCode
    }
  }
`;
