import { gql } from '@apollo/client';

// Creates an empty campaign, in the shape `generateCreateOneRecordMutation`
// produces for `messageCampaign` — `createMessageCampaign(data:)` with a
// `MessageCampaignCreateInput`.
//
// The new campaign carries a name and nothing else. It is a draft: no
// audience, no content, no sender, and the native default status. Creating
// one queues nothing and emits nothing, and a draft is explicitly not a
// finished campaign — its content and sender still have to be written and
// recorded.
//
// The caller supplies the id. That is what makes this safe to press twice:
// the same id is the same campaign, so a retried create cannot leave two
// half-made campaigns behind.
export const HERMES_RUNTIME_CREATE_CAMPAIGN = gql`
  mutation HermesRuntimeCreateCampaign($input: MessageCampaignCreateInput!) {
    createMessageCampaign(data: $input) {
      __typename
      id
      name
      status
      createdAt
    }
  }
`;
