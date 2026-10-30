import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLabCRMUiGalleryStory as Story } from '@/__stories__/twenty-ui-gallery/types/TwentyUiGalleryStory';
import { countrySelectTest } from '@/__stories__/twenty-ui-gallery/utils/countrySelectTest';
import { createGalleryStory } from '@/__stories__/twenty-ui-gallery/utils/createGalleryStory';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI Country Select',
  component: FrontComponentRenderer,
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const CountrySelectReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-country-select',
  runtime: 'react',
  play: countrySelectTest,
});

export const CountrySelectPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-country-select',
  runtime: 'preact',
  play: countrySelectTest,
});
