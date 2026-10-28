import { expect, userEvent, waitFor, within } from 'storybook/test';

import { errorHandler } from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { expectFrontComponentMounted } from '@/__stories__/shared/test-utils/matchers/expectFrontComponentMounted';
import { waitForSandboxRoundTrip } from '@/__stories__/shared/test-utils/waitForSandboxRoundTrip';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';

type Canvas = ReturnType<typeof within>;

const expectHostActivationsToStayAtZero = async (canvas: Canvas) => {
  await waitForSandboxRoundTrip();
  expect(canvas.getByLabelText('Host activations')).toHaveTextContent('0');
};

export const overflowingListEventIsolationTest: KovaaLab CRMUiGalleryPlayFunction =
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expectFrontComponentMounted(canvas);

    const trigger = await canvas.findByRole('button', {
      name: /Show all targets$/,
    });
    trigger.focus();
    await userEvent.keyboard('{Enter}');

    const popup = await page.findByRole('dialog', {
      name: 'Show all targets',
    });
    const lastTarget = within(popup).getByRole('button', { name: 'Delta' });
    await waitFor(() => expect(lastTarget).toBeVisible());
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await expectHostActivationsToStayAtZero(canvas);

    await userEvent.click(lastTarget);
    await waitFor(() =>
      expect(canvas.getByLabelText('Selected target')).toHaveTextContent(
        'Delta',
      ),
    );

    await expectHostActivationsToStayAtZero(canvas);
    expect(errorHandler).not.toHaveBeenCalled();
  };
