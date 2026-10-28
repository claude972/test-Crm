import { AnimatedContainer } from '@/ui/layout/animation/components/internal/AnimatedContainer/AnimatedContainer';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconButton } from 'kovaa-lab-ui/components/input';
import { type IconComponent } from 'kovaa-lab-ui/icon';

const StyledInlineCellButtonContainer = styled.div`
  align-items: center;
  display: flex;
`;

export const RecordInlineCellButton = ({
  Icon,
  onClick,
  ariaLabel,
}: {
  Icon: IconComponent;
  onClick?: () => void;
  ariaLabel?: string;
}) => {
  return (
    <AnimatedContainer>
      <StyledInlineCellButtonContainer>
        <IconButton
          elevated
          size="sm"
          aria-label={ariaLabel ?? t`Edit field`}
          onClick={onClick}
          data-testid="inline-cell-edit-mode-container"
        >
          <Icon />
        </IconButton>
      </StyledInlineCellButtonContainer>
    </AnimatedContainer>
  );
};
