import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Trans } from '@lingui/react/macro';
import { Section } from 'kovaa-lab-ui/components/layout';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { SettingsPath } from 'kovaa-lab-shared/types';
import { getSettingsPath, isDefined } from 'kovaa-lab-shared/utils';

import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { SettingsPageContainer } from '@/settings/components/SettingsPageContainer';
import { SettingsPageLayout } from '@/settings/components/layout/SettingsPageLayout';
import { StructureMetricValue } from '@/structures/components/StructureMetricValue';
import { HERMES_STRUCTURE_DASHBOARD } from '@/structures/graphql/metadata-queries/hermesStructureDashboard';
import { buildStructureMetricColumns } from '@/structures/utils/buildStructureMetricColumns';
import { type HermesStructureDashboard } from '@/structures/types/HermesStructureDashboard';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

const StyledNote = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledCompanyCell = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledTableViewport = styled.div`
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.accent.primary};
    outline-offset: ${themeCssVariables.spacing[1]};
  }
`;

export const SettingsStructuresDashboard = () => {
  const { t } = useLingui();

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

  // Counts only: the contract is explicit that no amount or currency is summed
  // here.
  const METRIC_LABELS: Record<string, string> = {
    companies: t`Companies`,
    people: t`People`,
    opportunities: t`Opportunities`,
    tasks: t`Tasks`,
  };

  const metricKeys = isDefined(dashboard)
    ? buildStructureMetricColumns(dashboard)
    : [];

  const totalByKey = new Map(
    (dashboard?.totals ?? []).map((total) => [total.key, total]),
  );

  const gridTemplateColumns = `minmax(0, 1.5fr) ${metricKeys
    .map(() => 'minmax(0, 1fr)')
    .join(' ')}`;

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
          <SettingsEmptyPlaceholder>
            {t`No access yet. Ask an administrator.`}
          </SettingsEmptyPlaceholder>
        )}

        {isDefined(dashboard) && dashboard.structures.length > 0 && (
          <Section.Root>
            <Section.Header title={t`Across your companies`} />

            {dashboard.partial && (
              <StyledNote>
                <Trans>Partial totals: some companies did not answer.</Trans>
              </StyledNote>
            )}

            <StyledTableViewport
              role="region"
              aria-label={t`Across your companies`}
              tabIndex={0}
            >
              <Table style={{ minWidth: 240 + metricKeys.length * 120 }}>
                <TableRow gridTemplateColumns={gridTemplateColumns}>
                  <TableHeader>{t`Company`}</TableHeader>
                  {metricKeys.map((key) => (
                    <TableHeader key={key} align="right">
                      {METRIC_LABELS[key] ?? key}
                    </TableHeader>
                  ))}
                </TableRow>

                <TableBody>
                  {/* The totals ride in the same grid as the rows beneath them,
                    so a figure and its sum sit in one column rather than in
                    two separately styled blocks. */}
                  <TableRow gridTemplateColumns={gridTemplateColumns}>
                    <TableCell color={themeCssVariables.font.color.secondary}>
                      {t`All your companies`}
                    </TableCell>
                    {/* Mapped over the same keys as the header, not over the
                      totals array: with the union above the two can differ in
                      length, and mapping the totals would shift every cell
                      under the wrong column. */}
                    {metricKeys.map((key) => {
                      const total = totalByKey.get(key);

                      return (
                        <TableCell key={key} align="right">
                          {isDefined(total) ? (
                            <StructureMetricValue metric={total} />
                          ) : (
                            // Reported by a structure but not summed by the
                            // server. An empty cell would read as a zero.
                            <Tag color="gray" variant="soft">
                              {t`Not summed`}
                            </Tag>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {dashboard.structures.map((row) => {
                    const metricByKey = new Map(
                      row.metrics.map((metric) => [metric.key, metric]),
                    );

                    return (
                      <TableRow
                        key={row.structure.workspaceId}
                        gridTemplateColumns={gridTemplateColumns}
                      >
                        <TableCell
                          color={themeCssVariables.font.color.primary}
                          overflow="hidden"
                        >
                          <StyledCompanyCell>
                            <OverflowingTextWithTooltip
                              text={row.structure.displayName}
                            />
                            {row.structure.isCurrent && (
                              <Tag color="blue" variant="soft" weight="medium">
                                {t`Current`}
                              </Tag>
                            )}
                            {row.structure.requiresAuthentication && (
                              <Tag
                                color="gray"
                                variant="outline"
                                borderStyle="dashed"
                              >
                                {t`Sign in required`}
                              </Tag>
                            )}
                          </StyledCompanyCell>
                        </TableCell>

                        {metricKeys.map((key) => {
                          const metric = metricByKey.get(key);

                          return (
                            <TableCell key={key} align="right">
                              {isDefined(metric) ? (
                                <StructureMetricValue metric={metric} />
                              ) : (
                                // The server did not report this metric for this
                                // company. An empty cell would read as a zero.
                                <Tag color="gray" variant="soft">
                                  {t`Unavailable`}
                                </Tag>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </StyledTableViewport>
          </Section.Root>
        )}
      </SettingsPageContainer>
    </SettingsPageLayout>
  );
};
