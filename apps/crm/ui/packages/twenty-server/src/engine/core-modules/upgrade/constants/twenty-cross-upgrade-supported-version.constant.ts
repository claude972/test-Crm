import { KOVAALAB_CURRENT_VERSION } from 'src/engine/core-modules/upgrade/constants/twenty-current-version.constant';
import { KOVAALAB_PREVIOUS_VERSIONS } from 'src/engine/core-modules/upgrade/constants/twenty-previous-versions.constant';

export const KOVAALAB_CROSS_UPGRADE_SUPPORTED_VERSIONS = [
  ...KOVAALAB_PREVIOUS_VERSIONS,
  KOVAALAB_CURRENT_VERSION,
] as const;

export type KovaaLabCRMCrossUpgradeSupportedVersion =
  (typeof KOVAALAB_CROSS_UPGRADE_SUPPORTED_VERSIONS)[number];
