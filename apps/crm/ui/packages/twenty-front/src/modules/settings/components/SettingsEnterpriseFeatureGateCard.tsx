import { currentUserState } from '@/auth/states/currentUserState';
import { billingState } from '@/client-config/states/billingState';
import { SettingsOptionCardContentButton } from '@/settings/components/SettingsOptions/SettingsOptionCardContentButton';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { IconArrowUp, IconLock } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { Card } from 'kovaa-lab-ui/primitives/surfaces';
import { useNavigateSettings } from '~/hooks/useNavigateSettings';

export const SettingsEnterpriseFeatureGateCard = ({
  title,
  description,
  buttonTitle,
}: {
  title: string;
  description: string;
  buttonTitle: string;
}) => {
  const currentUser = useAtomStateValue(currentUserState);
  const billing = useAtomStateValue(billingState);
  const navigateSettings = useNavigateSettings();

  const isBillingEnabled = billing?.isBillingEnabled ?? false;
  const canAccessAdminPanel = currentUser?.canAccessFullAdminPanel === true;
  const canDisplayUpgradeButton = isBillingEnabled || canAccessAdminPanel;
  const upgradeSettingsPath = isBillingEnabled
    ? SettingsPath.BillingPlans
    : SettingsPath.AdminPanelOrganization;

  return (
    <Card.Root>
      <SettingsOptionCardContentButton
        Icon={IconLock}
        title={title}
        description={description}
        Button={
          canDisplayUpgradeButton ? (
            <Button
              size="sm"
              startIcon={<IconArrowUp />}
              onClick={() => navigateSettings(upgradeSettingsPath)}
              variant="solid"
              color="accent"
            >
              {buttonTitle}
            </Button>
          ) : undefined
        }
      />
    </Card.Root>
  );
};
