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
        <HermesCampaignRuntimeContainer campaignId={campaignId} />
      ) : (
        <p>
          {t`No campaign is open. Open one from the campaigns list to see its audience, its sender and its results.`}
        </p>
      )}
    </PageCardLayout>
  );
};
