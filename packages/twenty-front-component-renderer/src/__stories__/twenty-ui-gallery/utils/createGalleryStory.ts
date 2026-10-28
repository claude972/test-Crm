import { type KovaaLab CRMUiGalleryPlayFunction } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryPlayFunction';
import { type KovaaLab CRMUiGalleryStory } from '@/__stories__/kovaa-lab-ui-gallery/types/KovaaLab CRMUiGalleryStory';
import { getBuiltStoryComponentPathForRender } from '@/__stories__/utils/getBuiltStoryComponentPathForRender';

type CreateGalleryStoryOptions = {
  frontComponentBundleName: string;
  runtime: 'react' | 'preact';
  play?: KovaaLab CRMUiGalleryPlayFunction;
  decorators?: KovaaLab CRMUiGalleryStory['decorators'];
};

export const createGalleryStory = ({
  frontComponentBundleName,
  runtime,
  play,
  decorators,
}: CreateGalleryStoryOptions): KovaaLab CRMUiGalleryStory => ({
  args: {
    componentUrl: getBuiltStoryComponentPathForRender(
      `${frontComponentBundleName}.front-component`,
      runtime,
    ),
  },
  play,
  decorators,
});
