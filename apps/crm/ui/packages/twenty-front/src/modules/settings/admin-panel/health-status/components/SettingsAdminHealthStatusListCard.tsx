import { SettingsListCard } from '@/settings/components/SettingsListCard';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import {
  IconAppWindow,
  type IconComponent,
  IconDatabase,
  IconServer2,
  IconTool,
  IconUserCircle,
} from 'kovaa-lab-ui/icon';
import { useTheme } from 'kovaa-lab-ui/theme';
import {
  HealthIndicatorId,
  type SystemHealthService,
} from '~/generated-admin/graphql';

import { SettingsAdminHealthStatusRightContainer } from './SettingsAdminHealthStatusRightContainer';

const HealthStatusIcons: { [k in HealthIndicatorId]: IconComponent } = {
  [HealthIndicatorId.database]: IconDatabase,
  [HealthIndicatorId.redis]: IconServer2,
  [HealthIndicatorId.worker]: IconTool,
  [HealthIndicatorId.connectedAccount]: IconUserCircle,
  [HealthIndicatorId.app]: IconAppWindow,
};

export const SettingsAdminHealthStatusListCard = ({
  services,
  loading,
}: {
  services: Array<SystemHealthService>;
  loading?: boolean;
}) => {
  const theme = useTheme();

  return (
    <SettingsListCard
      items={services}
      RowIconFn={(row) => HealthStatusIcons[row.id]}
      RowIconColor={theme.font.color.tertiary}
      getItemLabel={(service) => service.label}
      isLoading={loading}
      RowRightComponent={({ item: service }) => (
        <SettingsAdminHealthStatusRightContainer status={service.status} />
      )}
      to={(service) =>
        getSettingsPath(SettingsPath.AdminPanelIndicatorHealthStatus, {
          indicatorId: service.id,
        })
      }
    />
  );
};
