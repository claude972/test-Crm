import { IconSettings } from 'kovaa-lab-ui/icon';

import { HermesAdminRuntimeSettings } from '@/hermes-admin-runtime/components/HermesAdminRuntimeSettings';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesAdminRuntimePage = () => {
  return (
    <PageCardLayout
      header={
        <PageCardHeader
          icon={<IconSettings />}
          title="Connexions, WhatsApp et bot"
        />
      }
    >
      <HermesAdminRuntimeSettings />
    </PageCardLayout>
  );
};
