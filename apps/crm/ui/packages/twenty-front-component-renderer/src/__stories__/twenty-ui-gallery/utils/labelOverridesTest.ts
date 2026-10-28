import { expect, userEvent, waitFor, within } from 'storybook/test';

import { errorHandler } from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { expectFrontComponentMounted } from '@/__stories__/shared/test-utils/matchers/expectFrontComponentMounted';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';

export const labelOverridesTest: KovaaLab CRMUiGalleryPlayFunction = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  await expectFrontComponentMounted(canvas);

  expect(canvas.getByRole('button', { name: 'Close' })).toBeVisible();
  for (const label of ['then', 'followed by', 'next']) {
    expect(canvas.getByText(label)).toBeVisible();
  }

  await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notice' }));
  await waitFor(() =>
    expect(canvas.queryByText('Supplied notice')).not.toBeInTheDocument(),
  );
  expect(canvas.getByText('Default notice')).toBeVisible();
  expect(errorHandler).not.toHaveBeenCalled();
};
