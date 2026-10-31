import { gql } from '@apollo/client';

// The members of the campaign's audience list, so a preview can be asked for
// a named recipient rather than for "somebody".
//
// Hand-written in the same shape `generateFindManyRecordsQuery` produces for
// `messageListMember`, for the reason the rest of this module is: the screen
// reads a campaign without waiting for the object-metadata store.
//
// It is a read. It resolves no variable, renders no content and emits
// nothing: it only says who is on the list.
export const HERMES_RUNTIME_CAMPAIGN_RECIPIENTS = gql`
  query HermesRuntimeCampaignRecipients($listId: UUID!, $limit: Int) {
    messageListMembers(filter: { listId: { eq: $listId } }, first: $limit) {
      edges {
        node {
          __typename
          id
          listId
          personId
          person {
            __typename
            id
            name {
              firstName
              lastName
            }
            emails {
              primaryEmail
            }
          }
        }
      }
      totalCount
    }
  }
`;
