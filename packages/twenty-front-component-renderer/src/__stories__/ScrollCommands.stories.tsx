import { type Meta } from '@storybook/react-vite';

import {
  FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  resetFrontComponentStoryMocks,
} from '@/__stories__/shared/test-utils/createFrontComponentStoryMeta';
import { OverflowingListInstancesDecorator } from '@/__stories__/kovaa-lab-ui-gallery/components/OverflowingListInstancesDecorator';
import { ScrollBoundaryDecorator } from '@/__stories__/kovaa-lab-ui-gallery/components/ScrollBoundaryDecorator';
import { type KovaaLab CRMUiGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { createGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/utils/createGalleryStory';
import { scrollDetachNoReplayTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollDetachNoReplayTest';
import { scrollEchoElisionTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollEchoElisionTest';
import { scrollEventEchoTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollEventEchoTest';
import { scrollInstancesTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollInstancesTest';
import { scrollNestedRevealTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollNestedRevealTest';
import { scrollPageStaysLocalTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollPageStaysLocalTest';
import { scrollPortalRefreshTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollPortalRefreshTest';
import { scrollReadAfterWriteTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollReadAfterWriteTest';
import { scrollRtlRevealTest } from '@/__stories__/kovaa-lab-ui-gallery/utils/scrollRtlRevealTest';
import { FrontComponentRenderer } from '@/host/components/FrontComponentRenderer';

const meta: Meta<typeof FrontComponentRenderer> = {
  title: 'FrontComponent/Scroll Commands',
  component: FrontComponentRenderer,
  parameters: { layout: 'centered' },
  args: FRONT_COMPONENT_STORY_DEFAULT_ARGS,
  beforeEach: resetFrontComponentStoryMocks,
};

export default meta;

export const NestedRevealReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollNestedRevealTest,
  decorators: [ScrollBoundaryDecorator],
});

export const NestedRevealPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollNestedRevealTest,
  decorators: [ScrollBoundaryDecorator],
});

export const RtlRevealReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollRtlRevealTest,
});

export const RtlRevealPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollRtlRevealTest,
});

export const ReadAfterWriteReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollReadAfterWriteTest,
});

export const ReadAfterWritePreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollReadAfterWriteTest,
});

export const EchoElisionReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollEchoElisionTest,
});

export const EchoElisionPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollEchoElisionTest,
});

export const EventEchoReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollEventEchoTest,
});

export const EventEchoPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollEventEchoTest,
});

export const DetachNoReplayReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollDetachNoReplayTest,
});

export const DetachNoReplayPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollDetachNoReplayTest,
});

export const PortalRefreshReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollPortalRefreshTest,
});

export const PortalRefreshPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollPortalRefreshTest,
});

export const PageStaysLocalReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollPageStaysLocalTest,
  decorators: [ScrollBoundaryDecorator],
});

export const PageStaysLocalPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollPageStaysLocalTest,
  decorators: [ScrollBoundaryDecorator],
});

export const InstancesReact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'react',
  play: scrollInstancesTest,
  decorators: [OverflowingListInstancesDecorator],
});

export const InstancesPreact: KovaaLab CRMUiGalleryStory = createGalleryStory({
  frontComponentBundleName: 'scroll-commands',
  runtime: 'preact',
  play: scrollInstancesTest,
  decorators: [OverflowingListInstancesDecorator],
});
