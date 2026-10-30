import { useLingui } from '@lingui/react/macro';
import { IconGauge, IconInbox } from 'kovaa-lab-ui/icon';
import { useLocation } from 'react-router-dom';

import { HERMES_SHELL_ROUTE_PATHS } from '@/hermes-shell/constants/HermesShellRoutePaths';
import { PROSPECTION_RECEPTION_PATH } from '@/prospection/constants/ProspectionRoutePaths';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { PermissionFlagType } from '~/generated-metadata/graphql';

// The Hermes modules, offered inside the existing drawer.
//
// The dashboard lives outside this drawer, under its own shell, so without an
// entry here someone on a record page could only get back to it by typing the
// URL. The reception is the other way round: it renders inside this drawer, so
// this is how it is reached from anywhere other than the dashboard sidebar.
//
// The reception is gated on the WORKSPACE flag because the backend restricts
// those operations to unrestricted workspace administrators and refuses
// everyone else. Offering the link to a user who would only be refused would
// be worse than not offering it.
export const HermesModulesNavigationSection = () => {
  const { t } = useLingui();
  const { pathname } = useLocation();
  const hasWorkspacePermission = useHasPermissionFlag(
    PermissionFlagType.WORKSPACE,
  );

  return (
    <NavigationDrawerSection>
      <NavigationDrawerItem
        label={t`Dashboard`}
        Icon={IconGauge}
        to={HERMES_SHELL_ROUTE_PATHS.operationsDashboard}
        active={pathname === HERMES_SHELL_ROUTE_PATHS.operationsDashboard}
      />
      {hasWorkspacePermission && (
        <NavigationDrawerItem
          label={t`Reception`}
          Icon={IconInbox}
          to={PROSPECTION_RECEPTION_PATH}
          active={pathname.startsWith(PROSPECTION_RECEPTION_PATH)}
        />
      )}
    </NavigationDrawerSection>
  );
};
