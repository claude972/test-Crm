import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLab CRMUiGalleryStory as Story } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { labelOverridesTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/labelOverridesTest';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/Label overrides',
  component: FrontComponentRenderer,
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const React: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-label-overrides',
  runtime: 'react',
  play: labelOverridesTest,
});

export const Preact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-label-overrides',
  runtime: 'preact',
  play: labelOverridesTest,
});
