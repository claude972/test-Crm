import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { styled } from '@linaria/react';
import { SKELETON_HEIGHT_SIZES } from 'kovaa-lab-ui/primitives/feedback';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

const StyledSidePanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

export const SidePanelSkeletonLoader = () => {
  return (
    <StyledSidePanelContainer>
      <SkeletonLine height={SKELETON_HEIGHT_SIZES.m} width={140} />
    </StyledSidePanelContainer>
  );
};
