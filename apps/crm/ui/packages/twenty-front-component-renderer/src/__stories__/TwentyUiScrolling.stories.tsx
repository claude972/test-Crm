import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { type KovaaLab CRMUiGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { ScrollBoundaryDecorator } from '@/__stories__/kovaa-lab-ui-gallery/components/ScrollBoundaryDecorator';
import { autocompleteFilterResetTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteFilterResetTest';
import { autocompleteNestedRevealTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteNestedRevealTest';
import { autocompleteRevealTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/autocompleteRevealTest';
import { createAutocompleteLongInputTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/createAutocompleteLongInputTest';
import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { selectAlignedOpenTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/selectAlignedOpenTest';
import { selectRevealTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/selectRevealTest';
import { tabsOverflowTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/tabsOverflowTest';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/KovaaLab CRM UI Scrolling',
  component: FrontComponentRenderer,
  parameters: { layout: 'centered' },
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const AutocompleteRevealReact: KovaaLab CRMUiGalleryStory = createGalleryStory(
  {
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'react',
    play: autocompleteRevealTest,
  },
);

export const AutocompleteRevealPreact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'preact',
    play: autocompleteRevealTest,
  });

export const AutocompleteNestedRevealReact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'react',
    play: autocompleteNestedRevealTest,
    decorators: [ScrollBoundaryDecorator],
  });

export const AutocompleteNestedRevealPreact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'preact',
    play: autocompleteNestedRevealTest,
    decorators: [ScrollBoundaryDecorator],
  });

export const AutocompleteFilterResetReact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'react',
    play: autocompleteFilterResetTest,
  });

export const AutocompleteFilterResetPreact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'preact',
    play: autocompleteFilterResetTest,
  });

export const AutocompleteLongInputReact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'react',
    play: createAutocompleteLongInputTest({ isTrusted: false }),
  });

export const AutocompleteLongInputPreact: KovaaLab CRMUiGalleryStory =
  createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'preact',
    play: createAutocompleteLongInputTest({ isTrusted: false }),
  });

export const AutocompleteTrustedLongInputReact: KovaaLab CRMUiGalleryStory = {
  ...createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'react',
    play: createAutocompleteLongInputTest({ isTrusted: true }),
  }),
  tags: ['!dev'],
};

export const AutocompleteTrustedLongInputPreact: KovaaLab CRMUiGalleryStory = {
  ...createGalleryStory({
    frontComponentBundleName: 'kovaa-lab-ui-autocomplete-scrolling',
    runtime: 'preact',
    play: createAutocompleteLongInputTest({ isTrusted: true }),
  }),
  tags: ['!dev'],
};

export const SelectRevealReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-select-scrolling',
  runtime: 'react',
  play: selectRevealTest,
});

export const SelectRevealPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-select-scrolling',
  runtime: 'preact',
  play: selectRevealTest,
});

export const SelectAlignedOpenReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-select-scrolling',
  runtime: 'react',
  play: selectAlignedOpenTest,
});

export const SelectAlignedOpenPreact: KovaaLab CRMUiGalleryStory = createGalleryStory(
  {
    frontComponentBundleName: 'kovaa-lab-ui-select-scrolling',
    runtime: 'preact',
    play: selectAlignedOpenTest,
  },
);

export const TabsOverflowReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tabs-scrolling',
  runtime: 'react',
  play: tabsOverflowTest,
});

export const TabsOverflowPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'kovaa-lab-ui-tabs-scrolling',
  runtime: 'preact',
  play: tabsOverflowTest,
});
