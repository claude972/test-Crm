import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesAppHeader } from '@/hermes-shell/components/HermesAppHeader';
import { HermesSidebar } from '@/hermes-shell/components/HermesSidebar';
import { HERMES_SIDEBAR_WIDTH } from '@/hermes-shell/constants/HermesShellSizes';

const StyledShell = styled.div`
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  display: grid;
  grid-template-areas: 'sidebar header' 'sidebar main';
  grid-template-columns: ${HERMES_SIDEBAR_WIDTH}px minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 100%;
  width: 100%;

  /* Single column on narrow viewports: the sidebar becomes a band above the
     content rather than a hidden drawer, so every destination stays reachable
     without a control that would have to be invented. */
  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-areas: 'header' 'sidebar' 'main';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto minmax(0, 1fr);
    height: auto;
  }
`;

const StyledMain = styled.main`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  grid-area: main;
  min-width: 0;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[4]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    gap: ${themeCssVariables.spacing[4]};
    overflow-y: visible;
    padding: ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[3]};
  }
`;

type HermesShellLayoutProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
};

export const HermesShellLayout = ({
  title,
  subtitle,
  children,
}: HermesShellLayoutProps) => (
  <StyledShell>
    <HermesSidebar />
    <HermesAppHeader title={title} subtitle={subtitle} />
    <StyledMain>{children}</StyledMain>
  </StyledShell>
);
