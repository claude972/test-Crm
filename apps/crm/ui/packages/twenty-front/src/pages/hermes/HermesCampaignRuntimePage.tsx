import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useParams } from 'react-router-dom';
import { IconSend } from 'kovaa-lab-ui/icon';

import { HermesCampaignRuntimeContainer } from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

// A campaign is always read through its own identifier. Opening a default one
// would show someone else's campaign, so an address without an identifier says
// what to do instead of rendering nothing.
export const HermesCampaignRuntimePage = () => {
  const { t } = useLingui();
  const { campaignId } = useParams();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconSend />} title={t`Campaign`} />}
    >
      {isNonEmptyString(campaignId) ? (
        // Keyed by the campaign. The runtime hook holds the unsaved content,
        // schedule, sender choice and typed test address in local state, so
        // walking from one campaign to another on the same route would carry
        // the first one's draft onto the second and could save it there.
        <HermesCampaignRuntimeContainer
          key={campaignId}
          campaignId={campaignId}
        />
      ) : (
        <p>
          {t`No campaign is open. Open one from the campaigns list to see its audience, its sender and its results.`}
        </p>
      )}
    </PageCardLayout>
  );
};
