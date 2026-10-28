import { isSelectedItemIdComponentFamilyState } from '@/ui/layout/selectable-list/states/isSelectedItemIdComponentFamilyState';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { styled } from '@linaria/react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { SettingsRow } from 'kovaa-lab-ui/components/settings';
import { type IconComponent } from 'kovaa-lab-ui/icon';
import { type SwitchProps } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

type CommandMenuItemSwitchProps = {
  id: string;
  LeftIcon?: IconComponent;
  text: string;
  checked: boolean;
  onCheckedChange?: SwitchProps['onCheckedChange'];
  size?: SwitchProps['size'];
  disabled?: boolean;
};

const StyledIconContainer = styled.span`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  padding: ${themeCssVariables.spacing[1]};

  svg {
    height: calc(${themeCssVariables.icon.size.md} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
    width: calc(${themeCssVariables.icon.size.md} * 1px);
  }
`;

export const CommandMenuItemSwitch = ({
  id,
  LeftIcon,
  text,
  checked,
  onCheckedChange,
  size = 'md',
  disabled = false,
}: CommandMenuItemSwitchProps) => {
  const isSelectedItemId = useAtomComponentFamilyStateValue(
    isSelectedItemIdComponentFamilyState,
    id,
  );

  return (
    <SettingsRow
      focused={isSelectedItemId}
      startElement={
        isDefined(LeftIcon) && (
          <StyledIconContainer>
            <LeftIcon />
          </StyledIconContainer>
        )
      }
      disabled={disabled}
      checked={checked}
      onCheckedChange={onCheckedChange}
      size={size}
    >
      {text}
    </SettingsRow>
  );
};
