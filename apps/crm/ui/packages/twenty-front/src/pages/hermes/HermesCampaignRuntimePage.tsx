import { useParams } from 'react-router-dom';
import { isNonEmptyString } from '@sniptt/guards';

import { HermesCampaignRuntimeContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';

// A campaign is always read through its own identifier. Without one there is
// nothing to show, and inventing a default would open someone else's campaign.
export const HermesCampaignRuntimePage = () => {
  const { campaignId } = useParams();

  return isNonEmptyString(campaignId) ? (
    <HermesCampaignRuntimeContainer campaignId={campaignId} />
  ) : null;
};
