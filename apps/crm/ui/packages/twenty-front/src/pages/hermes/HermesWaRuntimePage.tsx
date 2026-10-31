import { useLingui } from '@lingui/react/macro';
import { IconBrandWhatsapp } from 'kovaa-lab-ui/icon';

import { HermesWaInboxRuntime } from '@/hermes-wa-runtime/components/HermesWaInboxRuntime';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesWaRuntimePage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconBrandWhatsapp />} title={t`WhatsApp`} />}
    >
      <HermesWaInboxRuntime />
    </PageCardLayout>
  );
};
