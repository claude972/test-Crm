import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconChevronLeft } from 'kovaa-lab-ui/icon';
import { IconButton } from 'kovaa-lab-ui/components/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledContainer = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  height: 40px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledText = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

type SidePanelSubPageNavigationHeaderProps = {
  title: string;
  onBackClick: () => void;
};

export const SidePanelSubPageNavigationHeader = ({
  onBackClick,
  title,
}: SidePanelSubPageNavigationHeaderProps) => {
  const { t } = useLingui();

  return (
    <StyledContainer>
      <IconButton
        onClick={onBackClick}
        variant="ghost"
        size="sm"
        aria-label={t`Go back`}
      >
        <IconChevronLeft />
      </IconButton>
      <StyledText>{title}</StyledText>
    </StyledContainer>
  );
};
