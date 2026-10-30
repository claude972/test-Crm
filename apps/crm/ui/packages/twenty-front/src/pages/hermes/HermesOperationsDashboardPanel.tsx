import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';

import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesOperationsDashboard } from '@/hermes-shell/dashboard/components/HermesOperationsDashboard';

const StyledPanel = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  min-width: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[4]};
  width: 100%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    gap: ${themeCssVariables.spacing[4]};
    padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[3]};
  }
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

// The same dashboard without the Hermès shell, for mounting inside the
// existing application layout: that layout already supplies a navigation
// drawer, and two sidebars on one screen is one too many.
export const HermesOperationsDashboardPanel = () => {
  const { t } = useLingui();

  return (
    <StyledPanel>
      <StyledTitle>{t`Dashboard`}</StyledTitle>
      <HermesOperationsDashboard />
    </StyledPanel>
  );
};
