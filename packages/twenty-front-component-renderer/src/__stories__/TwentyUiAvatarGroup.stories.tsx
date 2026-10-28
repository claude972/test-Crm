import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLab CRMUiGalleryStory as Story } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { avatarGroupTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/avatarGroupTest';
import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI AvatarGroup',
  component: FrontComponentRenderer,
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const AvatarGroupReact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-group',
  runtime: 'react',
  play: avatarGroupTest,
});

export const AvatarGroupPreact: Story = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-avatar-group',
  runtime: 'preact',
  play: avatarGroupTest,
});
