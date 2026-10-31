import { gql } from '@apollo/client';

// A typed DTO, like hermesInboundItemClassification next door. Every field
// below is checked against hermes-inbound-classification.dto.ts.
//
// No argument: the company is the session's own, and the receipts listed are
// the ones its signed connections account for. A caller cannot name another
// company, a connection or a page.
//
// Nothing here carries a secret. The receipt digest, the note title and the
// provider payload are not in this type and must never be. `cap` and
// `truncated` are the server's own statement that the page is a prefix:
// `bookingUid` is always null on a list read because the receipt does not
// store it, which is unknown and not "no booking".
export const HERMES_INBOUND_RECEIPTS = gql`
  query HermesInboundReceipts {
    hermesInboundReceipts {
      status
      checkedAt
      cap
      truncated
      receipts {
        noteId
        provider
        eventId
        bookingUid
        connectionId
        structureId
        receivedAt
        attribution
      }
    }
  }
`;
