import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useLocation } from 'react-router-dom';

import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesSidebarItem } from '@/hermes-shell/components/HermesSidebarItem';
import { useHermesNavigationSections } from '@/hermes-shell/hooks/useHermesNavigationSections';

const StyledSidebar = styled.nav`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  grid-area: sidebar;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: none;
    gap: ${themeCssVariables.spacing[3]};
    overflow-y: visible;
  }

  /* display: flex above would otherwise beat the hidden attribute, leaving a
     collapsed menu on screen and in the accessibility tree. */
  &[hidden] {
    display: none;
  }
`;

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

// Nested routes share a prefix, so an exact match is required for the root-level
// destinations and a prefix match for the ones that open sub-pages. Comparing
// the whole pathname would light up every settings entry at once.
const isNavigationItemActive = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

type HermesSidebarProps = {
  // Referenced by the toggle's aria-controls, so the button and the region it
  // opens are tied together rather than only visually related.
  id: string;
  isHidden: boolean;
  onNavigate?: () => void;
};

export const HermesSidebar = ({
  id,
  isHidden,
  onNavigate,
}: HermesSidebarProps) => {
  const { t } = useLingui();
  const { pathname } = useLocation();
  const sections = useHermesNavigationSections();

  return (
    <StyledSidebar id={id} hidden={isHidden} aria-label={t`Main navigation`}>
      {sections.map((section) => (
        <StyledSection key={section.key}>
          <StyledSectionTitle>{section.label}</StyledSectionTitle>
          {section.items.map((item) => (
            <HermesSidebarItem
              key={item.key}
              label={item.label}
              to={item.to}
              Icon={item.Icon}
              isActive={isNavigationItemActive(pathname, item.to)}
              onNavigate={onNavigate}
            />
          ))}
        </StyledSection>
      ))}
    </StyledSidebar>
  );
};
