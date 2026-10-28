import { styled } from '@linaria/react';
import type { IconComponent } from 'kovaa-lab-ui/icon';
import { type ButtonColor } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { CancelButton } from './CancelButton';
import { SaveButton } from './SaveButton';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

type SaveAndCancelButtonsProps = {
  onSave?: () => void;
  isLoading?: boolean;
  onCancel?: () => void;
  isSaveDisabled?: boolean;
  isCancelDisabled?: boolean;
  color?: ButtonColor;
  saveIcon?: IconComponent;
};

export const SaveAndCancelButtons = ({
  onSave,
  isLoading,
  onCancel,
  isSaveDisabled,
  isCancelDisabled,
  color,
  saveIcon,
}: SaveAndCancelButtonsProps) => {
  return (
    <StyledContainer>
      <CancelButton
        onCancel={onCancel}
        disabled={isCancelDisabled}
        color={color}
      />
      <SaveButton
        onSave={onSave}
        disabled={isSaveDisabled}
        isLoading={isLoading}
        color={color}
        saveIcon={saveIcon}
      />
    </StyledContainer>
  );
};
