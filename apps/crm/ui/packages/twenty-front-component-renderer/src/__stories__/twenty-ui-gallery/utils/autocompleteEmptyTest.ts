import { expect, fireEvent, waitFor, within } from 'storybook/test';

import { errorHandler } from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { expectFrontComponentMounted } from '@/__stories__/shared/test-utils/matchers/expectFrontComponentMounted';
import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';

export const autocompleteEmptyTest: KovaaLab CRMUiGalleryPlayFunction = async ({
  canvasElement,
}) => {
  const canvas = within(canvasElement);
  await expectFrontComponentMounted(canvas);

  const input = canvas.getByRole('combobox', { name: 'Fruit' });
  const empty = canvas.getByRole('status', { name: 'Matching fruits' });
  await fireEvent.input(input, { target: { value: 'Kiwi' } });
  await waitFor(() => expect(empty).toHaveTextContent('No matching fruits.'));
  await expect(canvas.queryAllByRole('option')).toHaveLength(0);
  await fireEvent.input(input, { target: { value: 'Cherry' } });
  await canvas.findByRole('option', { name: 'Cherry' });
  await expect(empty).toBeEmptyDOMElement();

  const announcement = canvas.getByRole('status', {
    name: 'Empty announcement',
  });
  await waitFor(() =>
    expect(announcement.textContent).toBe(
      'No matching fruits.Try another search.',
    ),
  );
  await expect(input).toHaveValue('Cherry');
  await expect(errorHandler).not.toHaveBeenCalled();
};
