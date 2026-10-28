import { OnboardingHeader } from '@/onboarding/components/OnboardingHeader';
import { ONBOARDING_BACKGROUND_COMPONENT_MIN_VIEWPORT_WIDTH } from '@/onboarding/constants/OnboardingBackgroundComponentMinViewportWidth';
import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { themeCssVariables } from 'kovaa-lab-ui/theme';
import { useMediaQuery } from 'kovaa-lab-ui/utilities';

const StyledBackground = styled.div`
  background: ${themeCssVariables.background.secondary};
  display: flex;
  flex-direction: column;
  height: calc(100dvh / var(--t-zoom, 1));
  isolation: isolate;
  position: relative;
  width: 100%;
`;

const StyledBackgroundLayer = styled.div`
  inset: 0;
  pointer-events: none;
  position: absolute;
  z-index: -1;
`;

type OnboardingLayoutProps = {
  children: ReactNode;
  onBack?: () => void;
  isBackDisabled?: boolean;
  headerRightComponent?: ReactNode;
  backgroundComponent?: ReactNode;
};

export const OnboardingLayout = ({
  children,
  onBack,
  isBackDisabled,
  headerRightComponent,
  backgroundComponent,
}: OnboardingLayoutProps) => {
  const isBackgroundComponentVisible = useMediaQuery(
    doNotTranslate(
      `(min-width: ${ONBOARDING_BACKGROUND_COMPONENT_MIN_VIEWPORT_WIDTH}px)`,
    ),
  );

  return (
    <StyledBackground>
      {isDefined(backgroundComponent) && isBackgroundComponentVisible && (
        <StyledBackgroundLayer>{backgroundComponent}</StyledBackgroundLayer>
      )}
      <OnboardingHeader
        onBack={onBack}
        isBackDisabled={isBackDisabled}
        rightComponent={headerRightComponent}
      />
      {children}
    </StyledBackground>
  );
};
