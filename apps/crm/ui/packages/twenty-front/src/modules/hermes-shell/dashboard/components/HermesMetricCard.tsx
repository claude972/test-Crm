import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

import { isDefined } from 'kovaa-lab-shared/utils';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMetricValue } from '@/hermes-shell/dashboard/components/HermesMetricValue';
import { type HermesMetric } from '@/hermes-shell/dashboard/types/HermesMetric';

const StyledCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
`;

type HermesMetricCardProps = {
  label: string;
  metric: HermesMetric;
  hint?: ReactNode;
};

export const HermesMetricCard = ({
  label,
  metric,
  hint,
}: HermesMetricCardProps) => (
  <StyledCard>
    <StyledLabel>{label}</StyledLabel>
    <HermesMetricValue metric={metric} />
    {isDefined(hint) && <StyledHint>{hint}</StyledHint>}
  </StyledCard>
);
