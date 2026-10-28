import { styled } from '@linaria/react';
import { getCommandMenuItemProgressLabel } from '@/command-menu-item/utils/getCommandMenuItemProgressLabel';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Loader } from 'kovaa-lab-ui/primitives/feedback';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledProgressText = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  white-space: nowrap;
`;

export const CommandListItemLoader = ({ progress }: { progress?: number }) => {
  if (!isDefined(progress)) {
    return <Loader />;
  }

  return (
    <StyledContainer>
      <StyledProgressText>
        {getCommandMenuItemProgressLabel(progress)}
      </StyledProgressText>
      <Loader />
    </StyledContainer>
  );
};
