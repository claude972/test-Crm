import { errorHandler } from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';
import { expectAssertionToKeepFailing } from '@/__stories__/kovaa-lab-ui-gallery/utils/expectAssertionToKeepFailing';
import { expectSliderGalleryMounted } from '@/__stories__/kovaa-lab-ui-gallery/utils/expectSliderGalleryMounted';
import { expect } from 'storybook/test';

export const sliderHiddenEdgeThumbTest: KovaaLab CRMUiGalleryPlayFunction = async ({
  canvasElement,
}) => {
  const slider = await expectSliderGalleryMounted(canvasElement);

  await expectAssertionToKeepFailing(() => expect(slider).toBeVisible());
  expect(errorHandler).not.toHaveBeenCalled();
};
