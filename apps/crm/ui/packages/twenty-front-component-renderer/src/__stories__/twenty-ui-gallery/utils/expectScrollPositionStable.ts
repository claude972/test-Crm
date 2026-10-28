import { expect } from 'storybook/test';

import { waitForGeometryTrackerToIdle } from '@/__stories__/kovaa-lab-ui-gallery/utils/waitForGeometryTrackerToIdle';

export const expectScrollPositionStable = async (
  scrollContainer: Element,
): Promise<void> => {
  await waitForGeometryTrackerToIdle();

  const settledScrollTop = scrollContainer.scrollTop;
  const settledScrollLeft = scrollContainer.scrollLeft;

  await waitForGeometryTrackerToIdle();

  expect(scrollContainer.scrollTop).toBe(settledScrollTop);
  expect(scrollContainer.scrollLeft).toBe(settledScrollLeft);
};
