import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';

import { HermesEvolutionConnectionCard } from '@/connectors/components/HermesEvolutionConnectionCard';
import { HERMES_EVOLUTION_CONNECTION } from '@/connectors/graphql/metadata-queries/hermesEvolutionConnection';
import { type HermesEvolutionConnection } from '@/connectors/types/HermesEvolutionConnection';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

export const SettingsIntegrations = () => {
  const { data, loading, error } = useQuery<{
    hermesEvolutionConnection: HermesEvolutionConnection | null;
  }>(HERMES_EVOLUTION_CONNECTION, {
    // The status is a point-in-time fact about a remote provider. A cached
    // answer would show a line as open after it dropped, which is the one
    // mistake this screen must not make.
    fetchPolicy: 'network-only',
  });

  const connection = data?.hermesEvolutionConnection;

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
        {/* This page reports state. It does not configure anything yet, and
            saying so is better than offering a control that does nothing. */}
        <StyledNote>
          <Trans>
            What the server currently knows about each connection. This screen
            reports status only — it does not connect, disconnect or hold
            credentials.
          </Trans>
        </StyledNote>

        <Section.Root>
          <Section.Header title={t`WhatsApp`} />

          {loading && (
            <StyledNote>
              <Trans>Checking the connection…</Trans>
            </StyledNote>
          )}

          {isDefined(error) && (
            <StyledNote role="alert">
              <Trans>
                The connection state could not be read. That is an unknown
                state, not a disconnected one.
              </Trans>
            </StyledNote>
          )}

          {!loading && !isDefined(error) && !isDefined(connection) && (
            <StyledNote>
              <Trans>
                No WhatsApp connection exists for this company yet.
              </Trans>
            </StyledNote>
          )}

          {isDefined(connection) && (
            <HermesEvolutionConnectionCard connection={connection} />
          )}
        </Section.Root>
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
