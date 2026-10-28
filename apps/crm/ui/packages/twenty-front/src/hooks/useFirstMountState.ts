import { useRef } from 'react';

export const useFirstMountState = (): boolean => {
  // oxlint-disable-next-line kovaa-lab/no-state-useref
  const isFirst = useRef(true);

  if (isFirst.current) {
    isFirst.current = false;

    return true;
  }

  return isFirst.current;
};
