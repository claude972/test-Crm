import { useLingui } from '@lingui/react/macro';
import { IconSettings } from 'kovaa-lab-ui/icon';

import { HermesAdminRuntimeSettings } from '@/hermes-admin-runtime/components/HermesAdminRuntimeSettings';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesAdminRuntimePage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={
        <PageCardHeader icon={<IconSettings />} title={t`Connections and companies`} />
      }
    >
      <HermesAdminRuntimeSettings />
    </PageCardLayout>
  );
};
