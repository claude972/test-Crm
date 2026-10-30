import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { ProspectionCountValue } from '@/prospection/components/ProspectionCountValue';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));

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

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export type ProspectionCounter = {
  key: string;
  // A node, so a counter can be labelled by the status tag it counts.
  label: ReactNode;
  count: ProspectionCount;
};

type ProspectionCountersProps = {
  counters: ProspectionCounter[];
};

export const ProspectionCounters = ({
  counters,
}: ProspectionCountersProps) => (
  <StyledGrid>
    {counters.map(({ key, label, count }) => (
      <StyledCard key={key}>
        <StyledLabel>{label}</StyledLabel>
        <ProspectionCountValue count={count} />
      </StyledCard>
    ))}
  </StyledGrid>
);
