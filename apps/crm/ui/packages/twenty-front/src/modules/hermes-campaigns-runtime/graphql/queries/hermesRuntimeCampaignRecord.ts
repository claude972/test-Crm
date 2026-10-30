import { gql } from '@apollo/client';

// The campaign record itself, on the core workspace schema.
//
// `messageCampaign` is a standard workspace object, so this is the operation
// `useFindOneRecord` would generate for it, written out here so the container
// does not need the object metadata store to be loaded before it can read a
// campaign. Only published fields are selected: nothing on this screen is
// computed from a field the server did not answer with.
export const HERMES_RUNTIME_CAMPAIGN_RECORD = gql`
  query HermesRuntimeCampaignRecord($campaignId: UUID!) {
    messageCampaign(filter: { id: { eq: $campaignId } }) {
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
      sentAt
      sentCount
      deliveredCount
      failedCount
      bouncedCount
      complainedCount
      skippedCount
      uniqueOpenCount
      uniqueClickCount
    }
  }
`;
