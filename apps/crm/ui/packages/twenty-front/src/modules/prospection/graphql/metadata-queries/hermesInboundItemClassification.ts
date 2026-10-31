import { gql } from '@apollo/client';

// A typed DTO, like hermesIntakeState next door. Every field below is checked
// against hermes-inbound-classification.dto.ts.
//
// The arguments are the identifiers a bridge receipt already carries: the
// provider, its event id, and for a booking the booking uid. None of them
// selects a company — the company is the session's, and the signed connections
// the server considers are that company's own bindings. A caller cannot reach
// another company's receipt by naming one.
//
// `existingOpportunityIds` is a READ of the opportunities that already point
// at the contact. It is the pipeline link, and it is never a creation: see
// HermesInboundClassification. `automaticDealCreated` is the server's own
// statement of that, read rather than assumed.
export const HERMES_INBOUND_ITEM_CLASSIFICATION = gql`
  query HermesInboundItemClassification(
    $provider: String!
    $eventId: String!
    $bookingUid: String
  ) {
    hermesInboundItemClassification(
      provider: $provider
      eventId: $eventId
      bookingUid: $bookingUid
    ) {
      status
      checkedAt
      contactState
      automaticDealCreated
      origin {
        source
        provider
        connectionId
        structureId
        eventId
        receivedAt
        attribution
      }
      links {
        personId
        companyId
        noteId
        calendarEventId
        conversationId
        existingOpportunityIds
      }
    }
  }
`;
