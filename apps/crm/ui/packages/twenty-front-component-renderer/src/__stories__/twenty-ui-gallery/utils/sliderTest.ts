import { errorHandler } from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { INTERACTION_TIMEOUT } from '@/__stories__/shared/test-utils/timeouts';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';
import { expectSliderGalleryMounted } from '@/__stories__/kovaa-lab-ui-gallery/utils/expectSliderGalleryMounted';
import { expect, waitFor } from 'storybook/test';

export const sliderTest: KovaaLab CRMUiGalleryPlayFunction = async ({
  canvasElement,
}) => {
  const slider = await expectSliderGalleryMounted(canvasElement);

  await waitFor(() => expect(slider).toBeVisible(), {
    timeout: INTERACTION_TIMEOUT,
  });
  expect(errorHandler).not.toHaveBeenCalled();
};
