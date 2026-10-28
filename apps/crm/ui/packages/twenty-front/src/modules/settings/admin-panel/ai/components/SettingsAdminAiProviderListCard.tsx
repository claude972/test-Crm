import { useNavigate } from 'react-router-dom';

import { t } from '@lingui/core/macro';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { Status } from 'kovaa-lab-ui/primitives/data-display';
import { IconPlug } from 'kovaa-lab-ui/icon';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { type AiProviderItem } from '@/settings/admin-panel/ai/types/AiProviderItem';
import { getProviderIcon } from '@/ai/utils/getProviderIcon';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { SettingsListCard } from '@/settings/components/SettingsListCard';

type SettingsAdminAiProviderListCardProps = {
  providers: AiProviderItem[];
  showAddButton?: boolean;
};

const getProviderDescription = (provider: AiProviderItem): string => {
  const parts: string[] = [];

  if (provider.region) {
    parts.push(provider.region);
  }

  if (provider.baseUrl) {
    parts.push(provider.baseUrl);
  }

  if (provider.authType === 'role') {
    parts.push(t`IAM role`);
  } else if (provider.apiKey) {
    parts.push(t`API key configured`);
  } else if (provider.hasAccessKey) {
    parts.push(t`IAM credentials`);
  }

  return parts.join(' · ');
};

const isProviderConfigured = (provider: AiProviderItem): boolean =>
  !!(provider.authType || provider.apiKey || provider.hasAccessKey);

export const SettingsAdminAiProviderListCard = ({
  providers,
  showAddButton = true,
}: SettingsAdminAiProviderListCardProps) => {
  const navigate = useNavigate();

  if (providers.length === 0 && showAddButton) {
    return (
      <SettingsCard
        to={getSettingsPath(SettingsPath.AdminPanelNewAiProvider)}
        title={t`Add Custom Provider`}
        Icon={<IconPlug />}
      />
    );
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <SettingsListCard
      items={providers}
      RowIconColor={themeCssVariables.font.color.primary}
      RowIconFn={(provider) => getProviderIcon(provider.name ?? provider.id)}
      getItemLabel={(provider) => provider.label ?? provider.id}
      getItemDescription={getProviderDescription}
      RowRightComponent={({ item: provider }) =>
        isProviderConfigured(provider) ? (
          <Status color="green" weight="medium">{t`Configured`}</Status>
        ) : (
          <Status color="orange" weight="medium">{t`No credentials`}</Status>
        )
      }
      to={(provider) =>
        getSettingsPath(SettingsPath.AdminPanelAiProviderDetail, {
          providerName: provider.id,
        })
      }
      hasFooter={showAddButton}
      footerButtonLabel={t`Add Custom Provider`}
      onFooterButtonClick={() =>
        navigate(getSettingsPath(SettingsPath.AdminPanelNewAiProvider))
      }
    />
  );
};
