import { gql } from '@apollo/client';

// Creates a draft and nothing else: the contract returns
// status 'DRAFT' with sendingAvailable false and states that no send action
// occurs. There is deliberately no sending operation in this module.
export const HERMES_CREATE_CAMPAIGN_DRAFT = gql`
  mutation HermesCreateCampaignDraft($input: HermesCreateCampaignDraftInput!) {
    hermesCreateCampaignDraft(input: $input)
  }
`;
