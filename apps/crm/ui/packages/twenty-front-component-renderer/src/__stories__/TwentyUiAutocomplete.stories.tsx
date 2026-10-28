import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLab CRMUiGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { autocompleteCompositionTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteCompositionTest';
import { autocompleteDismissalTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteDismissalTest';
import { autocompleteEmptyTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteEmptyTest';
import { autocompleteInputTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteInputTest';
import { autocompletePartsTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompletePartsTest';
import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI Autocomplete',
  component: FrontComponentRenderer,
  parameters: { layout: 'centered' },
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const InputReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteInputTest,
});

export const InputPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteInputTest,
});

export const CompositionReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteCompositionTest,
});

export const CompositionPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteCompositionTest,
});

export const EmptyReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'react',
  play: autocompleteEmptyTest,
});

export const EmptyPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete',
  runtime: 'preact',
  play: autocompleteEmptyTest,
});

export const PartsReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'react',
  play: autocompletePartsTest,
});

export const PartsPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'preact',
  play: autocompletePartsTest,
});

export const DismissalReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'react',
  play: autocompleteDismissalTest,
});

export const DismissalPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-autocomplete-parts',
  runtime: 'preact',
  play: autocompleteDismissalTest,
});
