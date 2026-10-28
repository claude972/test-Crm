import {
  type SelectControlProps,
  StyledControlContainer,
} from '@/ui/input/components/SelectControl';
import { styled } from '@linaria/react';
import React from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { TintedIconTile } from 'kovaa-lab-ui/components/data-display';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { IconChevronDown, type IconComponent } from 'kovaa-lab-ui/icon';
import { type ThemeColor, useTheme, themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledIconChevronDownWrapper = styled.div<{
  disabled?: boolean;
}>`
  color: ${({ disabled }) =>
    disabled
      ? themeCssVariables.font.color.extraLight
      : themeCssVariables.font.color.tertiary};
  display: flex;
`;

type MultiSelectOptionType = {
  label: string;
  Icon: IconComponent;
  iconThemeColor?: ThemeColor | null;
};

type MultiSelectControlProps = Omit<SelectControlProps, 'selectedOption'> & {
  fixedIcon?: IconComponent;
  fixedText?: string;
  selectedOptions: MultiSelectOptionType[];
};

export const MultiSelectControl = ({
  fixedIcon,
  fixedText,
  selectedOptions,
  isDisabled,
  selectSizeVariant,
  textAccent = 'default',
  hasRightElement,
}: MultiSelectControlProps) => {
  const theme = useTheme();
  const firstSelectedOption = selectedOptions?.[0];
  return (
    <StyledControlContainer
      disabled={isDisabled}
      hasIcon={isDefined(fixedIcon) || isDefined(firstSelectedOption?.Icon)}
      selectSizeVariant={selectSizeVariant}
      textAccent={textAccent}
      hasRightElement={hasRightElement}
    >
      {isDefined(fixedIcon) ? (
        React.createElement(fixedIcon, {
          color: isDisabled ? theme.font.color.light : theme.font.color.primary,
          size: theme.icon.size.md,
          stroke: theme.icon.stroke.sm,
        })
      ) : isDefined(firstSelectedOption?.Icon) ? (
        isDefined(firstSelectedOption.iconThemeColor) ? (
          <TintedIconTile
            icon={
              <firstSelectedOption.Icon
                size={theme.icon.size.md}
                stroke={theme.icon.stroke.sm}
              />
            }
            color={firstSelectedOption.iconThemeColor}
          />
        ) : (
          <firstSelectedOption.Icon
            color={
              isDisabled ? theme.font.color.light : theme.font.color.primary
            }
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
          />
        )
      ) : null}
      {isDefined(fixedText) ? (
        <OverflowingTextWithTooltip text={fixedText} />
      ) : (
        <OverflowingTextWithTooltip text={firstSelectedOption?.label ?? ''} />
      )}

      <StyledIconChevronDownWrapper disabled={isDisabled}>
        <IconChevronDown size={theme.icon.size.md} />
      </StyledIconChevronDownWrapper>
    </StyledControlContainer>
  );
};
