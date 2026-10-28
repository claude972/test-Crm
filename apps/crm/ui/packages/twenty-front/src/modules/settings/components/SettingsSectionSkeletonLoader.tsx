import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { SKELETON_HEIGHT_SIZES } from 'kovaa-lab-ui/primitives/feedback';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

type SettingsSectionSkeletonLoaderProps = {
  rowCount?: number;
};

export const SettingsSectionSkeletonLoader = ({
  rowCount = 4,
}: SettingsSectionSkeletonLoaderProps) => {
  return (
    <SkeletonLine
      count={rowCount}
      height={SKELETON_HEIGHT_SIZES.l}
      gap={themeCssVariables.spacing[2]}
    />
  );
};
