import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { isCloudflareIntegrationEnabledState } from '@/client-config/states/isCloudflareIntegrationEnabledState';
import { isMultiWorkspaceEnabledState } from '@/client-config/states/isMultiWorkspaceEnabledState';
import { SettingsCard } from '@/settings/components/SettingsCard';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';
import { IconWorld, IconWorldWww } from 'kovaa-lab-ui/icon';
import { Status } from 'kovaa-lab-ui/primitives/data-display';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[2]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    flex-direction: column;
  }
`;

export const SettingsWorkspaceDomainCard = () => {
  const { t } = useLingui();
  const isMultiWorkspaceEnabled = useAtomStateValue(
    isMultiWorkspaceEnabledState,
  );
  const isCloudflareIntegrationEnabled = useAtomStateValue(
    isCloudflareIntegrationEnabledState,
  );
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  if (!isMultiWorkspaceEnabled) {
    return null;
  }

  return (
    <StyledContainer>
      <SettingsCard
        title={t`Subdomain`}
        Icon={<IconWorldWww />}
        to={getSettingsPath(SettingsPath.Subdomain)}
      />
      {isCloudflareIntegrationEnabled && (
        <SettingsCard
          to={getSettingsPath(SettingsPath.CustomDomain)}
          title={t`Custom Domain`}
          Icon={<IconWorld />}
          Status={
            currentWorkspace?.customDomain &&
            currentWorkspace?.isCustomDomainEnabled ? (
              <Status color="turquoise">{t`Active`}</Status>
            ) : currentWorkspace?.customDomain ? (
              <Status color="orange">{t`Inactive`}</Status>
            ) : undefined
          }
        />
      )}
    </StyledContainer>
  );
};
