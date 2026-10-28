import { SettingsAccountsListEmptyStateCard } from '@/settings/accounts/components/SettingsAccountsListEmptyStateCard';
import { t } from '@lingui/core/macro';
import { Section } from 'kovaa-lab-ui/components/layout';

export const SettingsNewAccountSection = () => {
  return (
    <Section.Root>
      <Section.Header
        title={t`New account`}
        description={t`Connect a new account to your workspace`}
      />
      <SettingsAccountsListEmptyStateCard />
    </Section.Root>
  );
};
