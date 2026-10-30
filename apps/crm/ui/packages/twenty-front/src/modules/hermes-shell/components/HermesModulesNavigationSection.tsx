import { useLingui } from '@lingui/react/macro';
import { IconGauge, IconInbox, IconMessage } from 'kovaa-lab-ui/icon';
import { useLocation } from 'react-router-dom';

import {
  type HermesModuleNavigationItem,
  buildHermesModuleNavigationItems,
} from '@/hermes-shell/utils/buildHermesModuleNavigationItems';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { PermissionFlagType } from '~/generated-metadata/graphql';

// The Hermes modules, offered inside the existing drawer. The dashboard lives
// outside this drawer, under its own shell, so this section is what keeps it
// reachable from a record page without a typed URL. Which items appear is
// decided by buildHermesModuleNavigationItems, where it is tested.
export const HermesModulesNavigationSection = () => {
  const { t } = useLingui();
  const { pathname } = useLocation();
  const hasWorkspacePermission = useHasPermissionFlag(
    PermissionFlagType.WORKSPACE,
  );

  const labels: Record<HermesModuleNavigationItem['key'], string> = {
    dashboard: t`Dashboard`,
    messaging: t`Messaging`,
    reception: t`Hermès collections`,
  };

  const icons: Record<HermesModuleNavigationItem['key'], typeof IconGauge> = {
    dashboard: IconGauge,
    messaging: IconMessage,
    reception: IconInbox,
  };

  return (
    <NavigationDrawerSection>
      {buildHermesModuleNavigationItems({
        hasWorkspacePermission,
        pathname,
      }).map((item) => (
        <NavigationDrawerItem
          key={item.key}
          label={labels[item.key]}
          Icon={icons[item.key]}
          to={item.to}
          active={item.isActive}
        />
      ))}
    </NavigationDrawerSection>
  );
};
