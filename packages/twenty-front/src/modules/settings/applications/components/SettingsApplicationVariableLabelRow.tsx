import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconInfoCircle } from 'kovaa-lab-ui/icon';
import { Badge } from 'kovaa-lab-ui/primitives/data-display';
import { Tooltip } from 'kovaa-lab-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledLabelRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: 11px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

export const SettingsApplicationVariableLabelRow = ({
  variableKey,
  label,
  isDeprecated,
  description,
}: {
  variableKey: string;
  label?: string;
  isDeprecated: boolean;
  description: string;
}) => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <StyledLabelRow>
      <StyledLabel>{isNonEmptyString(label) ? label : variableKey}</StyledLabel>
      {isDeprecated && <Badge>{t`Deprecated`}</Badge>}
      {isNonEmptyString(description) && (
        <Tooltip
          content={description}
          sideOffset={5}
          side="bottom"
          positionMethod="fixed"
          delay={TooltipDelay.shortDelay}
        >
          <IconInfoCircle
            size={theme.icon.size.sm}
            color={theme.font.color.tertiary}
          />
        </Tooltip>
      )}
    </StyledLabelRow>
  );
};
