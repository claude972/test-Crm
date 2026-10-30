import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';

import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { StructureMetricValue } from '@/structures/components/StructureMetricValue';
import { HERMES_STRUCTURE_DASHBOARD } from '@/structures/graphql/metadata-queries/hermesStructureDashboard';
import { type HermesStructureDashboard } from '@/structures/types/HermesStructureDashboard';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: 1fr;
  }
`;

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMetricKey = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledStructureName = styled.h3`
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

// Metric keys the contract defines for this first batch. Counts only: the
// contract is explicit that no amount or currency is summed here.
const METRIC_LABELS: Record<string, string> = {
  companies: t`Companies`,
  people: t`People`,
  opportunities: t`Opportunities`,
  tasks: t`Tasks`,
};

const getMetricLabel = (key: string): string => METRIC_LABELS[key] ?? key;

export const SettingsStructuresDashboard = () => {
  const { data, loading, error } = useQuery<{
    hermesStructureDashboard: HermesStructureDashboard;
  }>(HERMES_STRUCTURE_DASHBOARD, {
    // The scope is omitted on purpose: the server resolves the authorised set
    // for this session on every request. Sending ids the client believes in
    // would cache an authorisation the server may already have revoked.
    variables: { input: null },
    fetchPolicy: 'network-only',
  });

  const dashboard = data?.hermesStructureDashboard;

  return (
    <SettingsPageLayout
      title={t`Your authorised companies`}
      links={[
        { children: t`Workspace` },
        {
          children: t`Your authorised companies`,
          href: getSettingsPath(SettingsPath.Structures),
        },
      ]}
    >
      <SettingsPageContainer>
        {/* Read-only on purpose: opening a company means signing in to it, so
            this page must not look like a company switcher. */}
        <StyledNote>
          <Trans>Read-only. Open a company to work in it.</Trans>
        </StyledNote>

        {loading && (
          <StyledNote>
            <Trans>Loading…</Trans>
          </StyledNote>
        )}

        {isDefined(error) && (
          <StyledNote role="alert">
            <Trans>Some data is unavailable.</Trans>
          </StyledNote>
        )}

        {isDefined(dashboard) && dashboard.structures.length === 0 && (
          <StyledNote>
            <Trans>No access yet. Ask an administrator.</Trans>
          </StyledNote>
        )}

        {isDefined(dashboard) && dashboard.structures.length > 0 && (
          <>
            {dashboard.partial && (
              <StyledNote>
                <Trans>Partial totals: some companies did not answer.</Trans>
              </StyledNote>
            )}

            <Section.Root>
              <Section.Header title={t`Across your companies`} />
              <StyledGrid>
                {dashboard.totals.map((total) => (
                  <StyledCard key={total.key}>
                    <StyledMetricKey>
                      {getMetricLabel(total.key)}
                    </StyledMetricKey>
                    <StructureMetricValue metric={total} />
                  </StyledCard>
                ))}
              </StyledGrid>
            </Section.Root>

            {dashboard.structures.map((row) => (
              <Section.Root key={row.structure.workspaceId}>
                <StyledStructureName>
                  {row.structure.isCurrent
                    ? t`${row.structure.displayName} — current`
                    : row.structure.displayName}
                </StyledStructureName>
                {row.structure.requiresAuthentication && (
                  <StyledNote>
                    <Trans>Sign in to this company to see its data.</Trans>
                  </StyledNote>
                )}
                <StyledGrid>
                  {row.metrics.map((metric) => (
                    <StyledCard key={metric.key}>
                      <StyledMetricKey>
                        {getMetricLabel(metric.key)}
                      </StyledMetricKey>
                      <StructureMetricValue metric={metric} />
                    </StyledCard>
                  ))}
                </StyledGrid>
              </Section.Root>
            ))}
          </>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
