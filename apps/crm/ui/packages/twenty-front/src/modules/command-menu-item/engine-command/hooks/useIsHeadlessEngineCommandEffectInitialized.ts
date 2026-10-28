import { useRef } from 'react';

export const useIsHeadlessEngineCommandEffectInitialized = () => {
  // eslint-disable-next-line kovaa-lab/no-state-useref
  const isInitializedRef = useRef(false);

  const setIsInitialized = (value: boolean) => {
    isInitializedRef.current = value;
  };

  return { isInitializedRef, setIsInitialized };
};
