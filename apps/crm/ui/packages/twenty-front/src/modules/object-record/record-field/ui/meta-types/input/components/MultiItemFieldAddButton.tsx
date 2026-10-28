import { styled } from '@linaria/react';
import { ListItemButton } from 'kovaa-lab-ui/components/navigation';
import { IconPlus } from 'kovaa-lab-ui/icon';
import { OverflowingTextWithTooltip } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledAddItemContainer = styled.div`
  padding: ${themeCssVariables.spacing[1]};
`;

type MultiItemFieldAddButtonProps = {
  label: string;
  onClick: () => void;
};

export const MultiItemFieldAddButton = ({
  label,
  onClick,
}: MultiItemFieldAddButtonProps) => (
  <StyledAddItemContainer>
    <ListItemButton onClick={onClick} startIcon={<IconPlus />}>
      <OverflowingTextWithTooltip text={label} />
    </ListItemButton>
  </StyledAddItemContainer>
);
