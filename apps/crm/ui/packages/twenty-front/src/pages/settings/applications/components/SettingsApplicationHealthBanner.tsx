import { isDefined } from 'kovaa-lab-shared/utils';
import { Callout } from 'kovaa-lab-ui/components/feedback';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { type ApplicationHealthStatus } from '~/generated-metadata/graphql';
import { getApplicationHealthBannerAppearance } from '~/pages/settings/applications/utils/getApplicationHealthBannerAppearance';

type SettingsApplicationHealthBannerProps = {
  healthStatus: ApplicationHealthStatus;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};

export const SettingsApplicationHealthBanner = ({
  healthStatus,
  title,
  description,
  action,
}: SettingsApplicationHealthBannerProps) => {
  const appearance = getApplicationHealthBannerAppearance(healthStatus);

  if (!isDefined(appearance)) {
    return null;
  }

  return (
    <Callout
      status={appearance.status}
      icon={
        <appearance.Icon
          size={themeCssVariables.icon.size.md}
          aria-hidden={true}
        />
      }
      title={title}
      description={description}
      action={
        isDefined(action) ? (
          <Callout.Action type="button" onClick={action.onClick}>
            {action.label}
          </Callout.Action>
        ) : undefined
      }
      fullWidth
    />
  );
};
