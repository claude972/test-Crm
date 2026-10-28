import { styled } from '@linaria/react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { Text } from 'kovaa-lab-ui/primitives/typography';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledContainer = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
  padding-block: ${themeCssVariables.spacing[0.5]};
  padding-inline: ${themeCssVariables.spacing[1]};
`;

const StyledNumber = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

type WorkflowDiagramEdgeLabelProps = {
  label: string;
  elseIfIndex?: number;
};

export const WorkflowDiagramEdgeLabel = ({
  label,
  elseIfIndex,
}: WorkflowDiagramEdgeLabelProps) => {
  return (
    <StyledContainer>
      {isDefined(elseIfIndex) && <StyledNumber>{elseIfIndex}</StyledNumber>}
      <Text size="xs" weight="semibold" color="light">
        {label}
      </Text>
    </StyledContainer>
  );
};
