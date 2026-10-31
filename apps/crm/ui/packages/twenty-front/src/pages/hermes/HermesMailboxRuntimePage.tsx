import { useLingui } from '@lingui/react/macro';
import { IconMail } from 'kovaa-lab-ui/icon';

import { HermesMailboxRuntime } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntime';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';

export const HermesMailboxRuntimePage = () => {
  const { t } = useLingui();

  return (
    <PageCardLayout
      header={<PageCardHeader icon={<IconMail />} title={t`Mailbox`} />}
    >
      <HermesMailboxRuntime />
    </PageCardLayout>
  );
};
