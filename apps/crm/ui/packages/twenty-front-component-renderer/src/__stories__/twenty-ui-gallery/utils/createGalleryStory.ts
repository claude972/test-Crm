import { type KovaaLabCRMUiGalleryPlayFunction } from '@/__stories__/twenty-ui-gallery/types/TwentyUiGalleryPlayFunction';
import { type KovaaLabCRMUiGalleryStory } from '@/__stories__/twenty-ui-gallery/types/TwentyUiGalleryStory';
import { getBuiltStoryComponentPathForRender } from '@/__stories__/utils/getBuiltStoryComponentPathForRender';

type CreateGalleryStoryOptions = {
  frontComponentBundleName: string;
  runtime: 'react' | 'preact';
  play?: KovaaLabCRMUiGalleryPlayFunction;
  decorators?: KovaaLabCRMUiGalleryStory['decorators'];
};

export const createGalleryStory = ({
  frontComponentBundleName,
  runtime,
  play,
  decorators,
}: CreateGalleryStoryOptions): KovaaLabCRMUiGalleryStory => ({
  args: {
    componentUrl: getBuiltStoryComponentPathForRender(
      `${frontComponentBundleName}.front-component`,
      runtime,
    ),
  },
  play,
  decorators,
});
