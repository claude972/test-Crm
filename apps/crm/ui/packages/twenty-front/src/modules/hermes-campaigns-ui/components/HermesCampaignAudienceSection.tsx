import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { IconAlertTriangle, IconCheck, IconHelpCircle } from 'kovaa-lab-ui/icon';
import { Tag } from 'kovaa-lab-ui/primitives/data-display';
import { Section } from 'kovaa-lab-ui/components/layout';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignCountValue } from '@/hermes-campaigns-ui/components/HermesCampaignCountValue';
import { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import {
  type HermesAudienceExclusionReason,
  type HermesCampaignAudience,
} from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { aggregateAudienceExclusions } from '@/hermes-campaigns-ui/utils/aggregateAudienceExclusions';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';

// The reason column is the widest: a reason outside the contract shows its
// raw code, and a partial figure carries its denominator.
const EXCLUSIONS_GRID_TEMPLATE_COLUMNS = 'minmax(0, 2.4fr) minmax(0, 1fr)';

const StyledLayout = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
`;

const StyledHeadline = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledHeadlineLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSubTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledVariables = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledVariable = styled.li`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledVariableName = styled.code`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

type HermesCampaignAudienceSectionProps = {
  load: HermesCampaignLoad<HermesCampaignAudience>;
  onRetry?: () => void;
};

export const HermesCampaignAudienceSection = ({
  load,
  onRetry,
}: HermesCampaignAudienceSectionProps) => {
  const { t, i18n } = useLingui();

  const audience = load.kind === 'ready' ? load.value : null;

  const aggregate = useMemo(
    () => aggregateAudienceExclusions(audience?.exclusions ?? []),
    [audience],
  );

  const reasonLabels: Record<HermesAudienceExclusionReason, string> = {
    'marketing-objection': t`Durable marketing objection`,
    'resolved-duplicate': t`Duplicate resolved onto one record`,
    'invalid-address': t`Address invalid at normalisation`,
    'incomplete-qualification': t`Qualification incomplete`,
  };

  const retainedCount = audience?.retainedCount;
  const hasRetainedCount =
    isDefined(retainedCount) &&
    Number.isInteger(retainedCount) &&
    retainedCount >= 0;

  return (
    <Section.Root>
      <Section.Header
        title={t`Audience`}
        description={t`Recipients retained, and every record the server set aside, by reason.`}
      />

      <HermesCampaignLoadView
        load={load}
        emptyTitle={t`No audience`}
        emptyDescription={t`This campaign has no audience list yet, so it has no recipients.`}
        notConfiguredTitle={t`Audience not computed yet`}
        notConfiguredDescription={t`The audience is computed from qualified records. Import and qualification come first.`}
        failedTitle={t`The audience could not be read`}
        onRetry={onRetry}
      >
        <StyledLayout>
          <StyledHeadline>
            <StyledHeadlineLabel>{t`Recipients retained`}</StyledHeadlineLabel>
            {/* A missing figure reads as unknown, not as nobody. */}
            <HermesCampaignCountValue
              count={
                hasRetainedCount
                  ? { kind: 'exact', value: retainedCount }
                  : { kind: 'unknown', unreadableEntryCount: 1 }
              }
            />
            <StyledHeadlineLabel>{t`Records excluded`}</StyledHeadlineLabel>
            <HermesCampaignCountValue count={aggregate.total} />
          </StyledHeadline>

          <Table>
            <TableRow gridTemplateColumns={EXCLUSIONS_GRID_TEMPLATE_COLUMNS}>
              <TableHeader>{t`Exclusion reason`}</TableHeader>
              <TableHeader>{t`Records`}</TableHeader>
            </TableRow>
            <TableBody>
              {aggregate.rows.map((row) => (
                <TableRow
                  key={row.key}
                  gridTemplateColumns={EXCLUSIONS_GRID_TEMPLATE_COLUMNS}
                >
                  <TableCell overflow="hidden">
                    {isDefined(row.reason)
                      ? reasonLabels[row.reason]
                      : isNonEmptyString(row.unknownReason)
                        ? t`Reason outside the contract: ${row.unknownReason}`
                        : t`Reason not published`}
                  </TableCell>
                  <TableCell overflow="hidden">
                    <HermesCampaignCountValue count={row.count} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {aggregate.rows.length === 0 && (
            <HermesCampaignNote>
              {t`The server published no exclusion for this audience.`}
            </HermesCampaignNote>
          )}

          <StyledSubTitle>{t`Personalisation`}</StyledSubTitle>
          <StyledVariables>
            {(audience?.variables ?? []).map((variable) => {
              const missingCount = variable.missingCount;
              const isUnknown = !isDefined(missingCount);
              const isComplete = missingCount === 0;
              // Narrowed here rather than inside the JSX, so an unknown
              // coverage can never be formatted as a number.
              const label = isUnknown
                ? t`Coverage unknown`
                : missingCount === 0
                  ? t`Complete`
                  : t`Missing on ${i18n.number(missingCount)} records`;

              return (
                <StyledVariable key={variable.name}>
                  <StyledVariableName>{`{{${variable.name}}}`}</StyledVariableName>
                  {/* Three distinct answers: complete, missing on n records,
                      or not known. The third is never shown as the first. */}
                  <Tag
                    color={isComplete ? 'jade' : isUnknown ? 'gray' : 'amber'}
                    variant={isComplete ? 'soft' : isUnknown ? 'outline' : 'soft'}
                    borderStyle={isUnknown ? 'dashed' : 'solid'}
                    startIcon={
                      isComplete ? (
                        <IconCheck />
                      ) : isUnknown ? (
                        <IconHelpCircle />
                      ) : (
                        <IconAlertTriangle />
                      )
                    }
                    truncate={false}
                  >
                    {label}
                  </Tag>
                </StyledVariable>
              );
            })}
          </StyledVariables>

          {(audience?.variables ?? []).length === 0 && (
            <HermesCampaignNote>
              {t`No personalisation variable is declared for this audience.`}
            </HermesCampaignNote>
          )}

          <HermesCampaignNote>
            <Trans>
              The exclusions are checked again at departure, including an
              objection recorded after this preview or after the campaign was
              scheduled.
            </Trans>
          </HermesCampaignNote>
        </StyledLayout>
      </HermesCampaignLoadView>
    </Section.Root>
  );
};
