import { styled } from '@linaria/react';
import { type ReactNode } from 'react';

import { isDefined } from 'kovaa-lab-shared/utils';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HERMES_HEADER_HEIGHT } from '@/hermes-shell/constants/HermesShellSizes';
import { HERMES_PRODUCT_NAME } from '@/hermes-shell/constants/HermesProductName';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledHeader = styled.header`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  grid-area: header;
  justify-content: space-between;
  min-height: ${HERMES_HEADER_HEIGHT}px;
  padding: 0 ${themeCssVariables.spacing[4]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    align-items: flex-start;
    flex-direction: column;
    gap: ${themeCssVariables.spacing[1]};
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  }
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 0;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledProductName = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: nowrap;
`;

type HermesAppHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  // The mobile navigation toggle. Absent on desktop, where the navigation is
  // always on screen and a disclosure button would control nothing.
  navigationToggle?: ReactNode;
};

export const HermesAppHeader = ({
  title,
  subtitle,
  navigationToggle,
}: HermesAppHeaderProps) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  // The workspace name is only shown once it is actually loaded. No
  // placeholder name stands in for it, and the header carries no action: the
  // shell offers no control it cannot perform.
  const workspaceName = currentWorkspace?.displayName;

  return (
    <StyledHeader>
      {navigationToggle}
      <StyledTitleGroup>
        <StyledTitle>{title}</StyledTitle>
        {isDefined(subtitle) && <StyledSubtitle>{subtitle}</StyledSubtitle>}
      </StyledTitleGroup>
      <StyledProductName>
        {isDefined(workspaceName) && workspaceName !== ''
          ? `${workspaceName} · ${HERMES_PRODUCT_NAME}`
          : HERMES_PRODUCT_NAME}
      </StyledProductName>
    </StyledHeader>
  );
};
