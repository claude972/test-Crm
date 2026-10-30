import { gql } from '@apollo/client';

// The human reply, V3.
//
// `clientRequestId` is the durable idempotency key and is minted by the client,
// once per attempt. The contract is explicit: after a timeout or an UNCONFIRMED
// answer, the original id returns the original result and never re-emits a
// provider POST — so a replay must carry the SAME id, and new content must get
// a new one. Nothing in this module mints a second id for the same body.
//
// `kind` is TEXT, IMAGE, VIDEO or AUDIO. TEXT needs non-blank text and no
// assetId; the other three need one READY asset. AUDIO needs EMPTY text,
// because the documented voice route carries no caption.
//
// The answer's `status` is read with exactly the contract's meaning: ACCEPTED is
// provider acceptance and never a delivery or a read.
export const HERMES_WA_REPLY_V3 = gql`
  mutation HermesWaReplyV3($input: HermesInboxReplyV3Input!) {
    hermesInboxReplyV3(input: $input) {
      id
      conversationId
      channel
      direction
      text
      status
      occurredAt
      errorCode
      providerMessageId
      kind
      attachments {
        id
        kind
        filename
        mimeType
        size
        status
      }
    }
  }
`;
