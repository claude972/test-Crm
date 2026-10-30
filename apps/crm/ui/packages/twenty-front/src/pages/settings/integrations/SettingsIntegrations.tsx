import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { IconRefresh } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath } from 'kovaa-lab-shared/utils';

import { HermesEvolutionConnectionCard } from '@/connectors/components/HermesEvolutionConnectionCard';
import { EVOLUTION_WHATSAPP_CONNECTOR_ID } from '@/connectors/constants/EvolutionWhatsappConnector';
import { useHermesEvolutionConnection } from '@/connectors/hooks/useHermesEvolutionConnection';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';

const StyledConnectorList = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

export const SettingsIntegrations = () => {
  const { state, refresh, isRefreshing } = useHermesEvolutionConnection();

  // Every connector shown on this page goes through the same panel. Only the
  // ones the server publishes a status for appear: a connector invented here
  // would be a claim the server never made.
  const connectors = [
    {
      id: EVOLUTION_WHATSAPP_CONNECTOR_ID,
      node: <HermesEvolutionConnectionCard state={state} />,
    },
  ];

  return (
    <SettingsPageLayout
      title={t`Integrations`}
      links={[
        { children: t`Workspace` },
        {
          children: t`Integrations`,
          href: getSettingsPath(SettingsPath.Integrations),
        },
      ]}
    >
      <SettingsPageContainer>
        <Section.Root>
          <Section.Header
            title={t`Connectors`}
            description={t`Configured by an administrator`}
            actions={
              <Button
                variant="outline"
                size="sm"
                startIcon={<IconRefresh />}
                loading={isRefreshing}
                loadingPosition="start"
                onClick={refresh}
              >
                <Trans>Refresh</Trans>
              </Button>
            }
          />

          {connectors.length === 0 ? (
            <StyledNote>
              <Trans>No connector available</Trans>
            </StyledNote>
          ) : (
            <StyledConnectorList>
              {connectors.map((connector) => (
                <div key={connector.id}>{connector.node}</div>
              ))}
            </StyledConnectorList>
          )}
        </Section.Root>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
