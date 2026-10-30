import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState, type ReactNode } from 'react';

import { IconButton } from 'kovaa-lab-ui/components/input';
import { IconLayoutSidebar, IconX } from 'kovaa-lab-ui/icon';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';
import { useIsMobile } from 'kovaa-lab-ui/utilities';

import { HermesAppHeader } from '@/hermes-shell/components/HermesAppHeader';
import { HermesSidebar } from '@/hermes-shell/components/HermesSidebar';
import { HERMES_SIDEBAR_WIDTH } from '@/hermes-shell/constants/HermesShellSizes';

// Tied to the toggle through aria-controls, so the button names the region it
// opens instead of merely sitting next to it.
const HERMES_NAVIGATION_ID = 'hermes-main-navigation';

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
}: HermesShellLayoutProps) => {
  const { t } = useLingui();
  const isMobile = useIsMobile();

  // Collapsed to start on a phone. The sidebar lists every readable object, so
  // as a permanent band it pushed the first figure a full screen down. Desktop
  // is unchanged: the navigation is always there and there is no button.
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const isNavigationVisible = !isMobile || isNavigationOpen;

  return (
    <StyledShell>
      <HermesSidebar
        id={HERMES_NAVIGATION_ID}
        isHidden={!isNavigationVisible}
        onNavigate={isMobile ? () => setIsNavigationOpen(false) : undefined}
      />
      <HermesAppHeader
        title={title}
        subtitle={subtitle}
        navigationToggle={
          isMobile ? (
            <IconButton
              // A real button, so the keyboard reaches it and Enter and Space
              // work without anything being reimplemented.
              aria-label={t`Main navigation`}
              aria-expanded={isNavigationOpen}
              aria-controls={HERMES_NAVIGATION_ID}
              variant="outline"
              size="sm"
              onClick={() => setIsNavigationOpen((isOpen) => !isOpen)}
            >
              {isNavigationOpen ? <IconX /> : <IconLayoutSidebar />}
            </IconButton>
          ) : undefined
        }
      />
      <StyledMain>{children}</StyledMain>
    </StyledShell>
  );
};
