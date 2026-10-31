import { gql } from '@apollo/client';

// A typed DTO, like hermesIntakeState next door. Every field below is checked
// against hermes-inbound-classification.dto.ts.
//
// No argument: the company comes from the session, never from the browser.
// Nothing here carries a secret — the HMAC key, the nonce and the absolute
// webhook URL are not in this type and must never be. `connectionId` is the
// only transport identifier published, and it is useless without a signature
// the browser cannot produce.
//
// `automaticDealCreated` is requested deliberately. It is the server's own
// statement that staging a deposit opened no opportunity, and the screen reads
// it rather than assuming it.
export const HERMES_SCRAPING_CLASSIFICATION = gql`
  query HermesScrapingClassification {
    hermesScrapingClassification {
      checkedAt
      structureId
      automaticDealCreated
      batches {
        batchId
        externalBatchId
        qualificationRequired
        linkedPersonIds
        linkedCompanyIds
        origin {
          source
          provider
          connectionId
          structureId
          eventId
          receivedAt
          attribution
        }
        counts {
          total
          pending
          invalid
          duplicate
          suppressed
          conflict
          qualified
        }
      }
    }
  }
`;
