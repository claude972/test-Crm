import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLabCRMUiGalleryStory } from '@/__stories__/twenty-ui-gallery/types/TwentyUiGalleryStory';
import { autocompleteCompositionTest } from '@/__stories__/twenty-ui-gallery/utils/autocompleteCompositionTest';
import { autocompleteDismissalTest } from '@/__stories__/twenty-ui-gallery/utils/autocompleteDismissalTest';
import { autocompleteEmptyTest } from '@/__stories__/twenty-ui-gallery/utils/autocompleteEmptyTest';
import { autocompleteInputTest } from '@/__stories__/twenty-ui-gallery/utils/autocompleteInputTest';
import { autocompletePartsTest } from '@/__stories__/twenty-ui-gallery/utils/autocompletePartsTest';
import { createGalleryStory } from '@/__stories__/twenty-ui-gallery/utils/createGalleryStory';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI Autocomplete',
  component: FrontComponentRenderer,
  parameters: { layout: 'centered' },
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const InputReact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteInputTest,
});

export const InputPreact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteInputTest,
});

export const CompositionReact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteCompositionTest,
});

export const CompositionPreact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteCompositionTest,
});

export const EmptyReact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteEmptyTest,
});

export const EmptyPreact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteEmptyTest,
});

export const PartsReact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'react',
  play: autocompletePartsTest,
});

export const PartsPreact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'preact',
  play: autocompletePartsTest,
});

export const DismissalReact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'react',
  play: autocompleteDismissalTest,
});

export const DismissalPreact: KovaaLabCRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'preact',
  play: autocompleteDismissalTest,
});
