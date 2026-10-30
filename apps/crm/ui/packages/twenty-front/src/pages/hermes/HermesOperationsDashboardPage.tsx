import { useLingui } from '@lingui/react/macro';

import { HermesShellLayout } from '@/hermes-shell/components/HermesShellLayout';
import { HermesOperationsDashboard } from '@/hermes-shell/dashboard/components/HermesOperationsDashboard';

export const HermesOperationsDashboardPage = () => {
  const { t } = useLingui();

  return (
    <HermesShellLayout
      title={t`Dashboard`}
      subtitle={t`Counts and records read from this workspace.`}
    >
      <HermesOperationsDashboard />
    </HermesShellLayout>
  );
};
