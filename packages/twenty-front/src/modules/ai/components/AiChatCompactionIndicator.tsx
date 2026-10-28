import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconTransform } from 'kovaa-lab-ui/icon';
import { useTheme, themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledIndicatorContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

export const AiChatCompactionIndicator = () => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <StyledIndicatorContainer>
      <IconTransform size={theme.icon.size.sm} />
      <div>{t`The conversation has been compacted`}</div>
    </StyledIndicatorContainer>
  );
};
