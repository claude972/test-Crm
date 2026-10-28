import { styled } from '@linaria/react';
import { Separator } from 'kovaa-lab-ui/primitives/layout';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledSeparatorContainer = styled.div`
  padding-inline: ${themeCssVariables.spacing[4]};
`;

export const SettingsCardSeparator = () => (
  <StyledSeparatorContainer>
    <Separator />
  </StyledSeparatorContainer>
);
