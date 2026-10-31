import { useLingui } from '@lingui/react/macro';
import { IconSend } from 'kovaa-lab-ui/icon';

import { HermesCampaignListContainer } from '@/hermes-campaigns-runtime';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

// No props: the container opens a campaign in place and offers its own way
// back, so neither direction of this route is a dead end.
export const HermesCampaignListPage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconSend />} title={t`Campaigns`} />}
    >
      <HermesCampaignListContainer />
    </PageCardLayout>
  );
};
