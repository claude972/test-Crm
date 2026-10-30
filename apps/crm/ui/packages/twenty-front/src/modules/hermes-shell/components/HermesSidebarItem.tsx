import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';

import { type IconComponent } from 'kovaa-lab-ui/icon';
import { themeCssVariables, useTheme } from 'kovaa-lab-ui/theme';

// The active state travels as a data attribute rather than a styled prop, so
// nothing custom reaches the anchor element.
const StyledItem = styled(Link)`
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  min-height: ${themeCssVariables.spacing[8]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-decoration: none;

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.light};
    border-color: ${themeCssVariables.border.color.medium};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
  }

  &:focus-visible {
    outline: 1px solid ${themeCssVariables.border.color.strong};
    outline-offset: 1px;
  }
`;

const StyledLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

type HermesSidebarItemProps = {
  label: string;
  to: string;
  Icon: IconComponent;
  isActive: boolean;
};

export const HermesSidebarItem = ({
  label,
  to,
  Icon,
  isActive,
}: HermesSidebarItemProps) => {
  const theme = useTheme();

  return (
    // The label is always rendered: the icon is decoration, never the only
    // name of a destination. aria-current carries the active state to
    // assistive technology, which the background tint alone would not.
    <StyledItem
      to={to}
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={theme.icon.size.md} aria-hidden />
      <StyledLabel>{label}</StyledLabel>
    </StyledItem>
  );
};
