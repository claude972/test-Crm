import { gql } from '@apollo/client';

// The audience lists of this company, so a campaign can actually be given
// one.
//
// Hand-written in the shape `generateFindManyRecordsQuery` produces for
// `messageList`, for the reason the rest of this module is: the screen reads
// and writes a campaign without waiting for the object-metadata store.
//
// The resolver derives the workspace from the authenticated session. No
// workspace id is sent and there is no variable here that could select one,
// so the lists of another company are not reachable by changing an argument.
//
// It is a read. Choosing a list writes `listId` on the campaign; the server
// then re-resolves the audience itself, applying its own rights and its own
// suppressions. Nothing here computes who will be written to.
export const HERMES_RUNTIME_CAMPAIGN_AUDIENCES = gql`
  query HermesRuntimeCampaignAudiences(
    $orderBy: [MessageListOrderByInput]
    $limit: Int
  ) {
    messageLists(orderBy: $orderBy, first: $limit) {
      edges {
        node {
          __typename
          id
          name
          description
          createdAt
        }
      }
      totalCount
    }
  }
`;
