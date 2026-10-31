import { gql } from '@apollo/client';

// The workspace's campaigns, newest first.
//
// Hand-written in the shape `generateFindManyRecordsQuery` produces for
// `messageCampaign`, for the same reason the rest of this module is: the
// list renders without waiting for the object-metadata store to load.
//
// The resolver derives the workspace from the authenticated session. No
// workspace id is sent, and there is no field here that could be used to
// select one: campaigns of another company are not reachable by changing a
// variable.
//
// It is a read. It queues nothing and emits nothing.
export const HERMES_RUNTIME_CAMPAIGN_LIST = gql`
  query HermesRuntimeCampaignList(
    $filter: MessageCampaignFilterInput
    $orderBy: [MessageCampaignOrderByInput]
    $limit: Int
  ) {
    messageCampaigns(filter: $filter, orderBy: $orderBy, first: $limit) {
      edges {
        node {
          __typename
          id
          name
          subject
          status
          scheduledAt
          sentAt
          createdAt
          sentCount
          failedCount
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;
