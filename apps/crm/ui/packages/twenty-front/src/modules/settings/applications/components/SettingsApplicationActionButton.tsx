import { formatQueueJobProgressLabel } from '@/queue-job/utils/formatQueueJobProgressLabel';
import { t } from '@lingui/core/macro';
import { Link } from 'react-router-dom';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';
import { IconDownload, IconSettings } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';

type SettingsApplicationActionButtonProps = {
  installedApplicationId?: string;
  canInstallMarketplaceApps?: boolean;
  onInstall?: () => void;
  isInstalling?: boolean;
  installProgress?: number;
};

export const SettingsApplicationActionButton = ({
  installedApplicationId,
  canInstallMarketplaceApps,
  onInstall,
  isInstalling,
  installProgress,
}: SettingsApplicationActionButtonProps) => {
  if (isDefined(installedApplicationId) && !isInstalling) {
    return (
      <Button
        startIcon={<IconSettings />}
        variant="solid"
        color="accent"
        size="sm"
        nativeButton={false}
        role="link"
        render={
          <Link
            to={getSettingsPath(SettingsPath.ApplicationDetail, {
              applicationId: installedApplicationId,
            })}
          />
        }
      >{t`Open settings`}</Button>
    );
  }

  if (!canInstallMarketplaceApps) {
    return null;
  }

  const displayedInstallProgress = formatQueueJobProgressLabel(
    installProgress ?? 0,
  );

  return (
    <Button
      startIcon={<IconDownload />}
      variant="solid"
      color="accent"
      size="sm"
      onClick={onInstall}
      loading={isInstalling}
      loadingPosition="end"
    >
      {isInstalling ? t`Installing ${displayedInstallProgress}` : t`Install`}
    </Button>
  );
};
