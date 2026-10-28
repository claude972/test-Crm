import { isDefined } from 'kovaa-lab-shared/utils';

import { type MediaQueryNumericFeature } from '@/polyfills/media-query/types/MediaQueryNumericFeature';
import { parseMediaQueryNumericFeatureName } from '@/polyfills/media-query/utils/parseMediaQueryNumericFeatureName';

export const parseMediaQueryBareNumericFeature = (
  featureName: string,
): MediaQueryNumericFeature | null => {
  const numericFeatureName = parseMediaQueryNumericFeatureName(featureName);

  if (!isDefined(numericFeatureName) || numericFeatureName.operator !== '=') {
    return null;
  }

  return numericFeatureName.feature;
};
