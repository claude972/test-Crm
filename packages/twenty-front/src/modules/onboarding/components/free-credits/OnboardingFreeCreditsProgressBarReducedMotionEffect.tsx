import { useEffect } from 'react';
import { useMediaQuery } from 'kovaa-lab-ui/utilities';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

const REDUCED_MOTION_QUERY = doNotTranslate('(prefers-reduced-motion: reduce)');

type OnboardingFreeCreditsProgressBarReducedMotionEffectProps = {
  hasTrackGrown: boolean;
  onTrackGrown: () => void;
};

export const OnboardingFreeCreditsProgressBarReducedMotionEffect = ({
  hasTrackGrown,
  onTrackGrown,
}: OnboardingFreeCreditsProgressBarReducedMotionEffectProps) => {
  const shouldReduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  useEffect(() => {
    if (hasTrackGrown || !shouldReduceMotion) {
      return;
    }

    onTrackGrown();
  }, [hasTrackGrown, onTrackGrown, shouldReduceMotion]);

  return null;
};
