import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'kovaa-lab-ui/primitives/feedback';

import { StyledSkeletonDiv } from './RecordInlineCellContainer';

export const RecordInlineCellSkeletonLoader = () => {
  return (
    <StyledSkeletonDiv>
      <SkeletonLine width={154} height={SKELETON_HEIGHT_SIZES.s} />
    </StyledSkeletonDiv>
  );
};
