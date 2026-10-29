import { KOVAALAB_CURRENT_VERSION } from 'src/engine/core-modules/upgrade/constants/twenty-current-version.constant';
import { KOVAALAB_NEXT_VERSIONS } from 'src/engine/core-modules/upgrade/constants/twenty-next-versions.constant';
import { KOVAALAB_PREVIOUS_VERSIONS } from 'src/engine/core-modules/upgrade/constants/twenty-previous-versions.constant';

export const KOVAALAB_ALL_VERSIONS = [
  ...KOVAALAB_PREVIOUS_VERSIONS,
  KOVAALAB_CURRENT_VERSION,
  ...KOVAALAB_NEXT_VERSIONS,
] as const;

export type KovaaLabCRMAllVersion = (typeof KOVAALAB_ALL_VERSIONS)[number];
