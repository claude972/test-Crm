import { In, IsNull, Not, Or } from 'typeorm';

import { CAMPAIGN_FAILURE_REASON } from 'src/engine/core-modules/emailing-domain/constants/campaign-failure-reason.constant';
import { CLAIMABLE_CAMPAIGN_DELIVERY_STATES } from 'src/engine/core-modules/emailing-domain/constants/claimable-campaign-delivery-states.constant';

export const buildNonQuarantinedCampaignDeliveryCriteria = () => ({
  failureReason: Or(
    IsNull(),
    Not(CAMPAIGN_FAILURE_REASON.SEND_OUTCOME_UNCONFIRMED),
  ),
});

export const buildClaimableCampaignDeliveryCriteria = () => ({
  state: In(CLAIMABLE_CAMPAIGN_DELIVERY_STATES),
  ...buildNonQuarantinedCampaignDeliveryCriteria(),
});
