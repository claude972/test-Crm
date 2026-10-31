import { gql } from '@apollo/client';

// Records a campaign's own fields on the campaign record.
//
// Written by hand on purpose, exactly as `generateUpdateOneRecordMutation`
// writes it for `messageCampaign` — `updateMessageCampaign(id:, data:)` with a
// `MessageCampaignUpdateInput` — so this module keeps reading and writing a
// campaign without waiting for the object-metadata store to be loaded, the
// same reason its read query is hand-written.
//
// It persists nothing but the campaign's own draft fields. It queues nothing,
// contacts no transport and reaches no recipient: saving a subject is not a
// send, and the engine re-reads the sender, the capability and the exclusions
// at departure whatever this recorded.
//
// The selection set mirrors the read query's fields so Apollo's normalised
// cache updates the open screen from the server's answer, rather than from
// what the screen hoped it wrote.
export const HERMES_RUNTIME_UPDATE_CAMPAIGN = gql`
  mutation HermesRuntimeUpdateCampaign(
    $idToUpdate: UUID!
    $input: MessageCampaignUpdateInput!
  ) {
    updateMessageCampaign(id: $idToUpdate, data: $input) {
      __typename
      id
      name
      subject
      bodyTemplate
      fromAddress {
        primaryEmail
      }
      listId
      unsubscribeTopicId
      status
      scheduledAt
    }
  }
`;
