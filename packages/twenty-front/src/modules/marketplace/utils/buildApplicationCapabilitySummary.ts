import { t } from '@lingui/core/macro';
import {
  type ApplicationCapability,
  isApplicationCapability,
} from 'kovaa-lab-shared/application';
import { assertUnreachable } from 'kovaa-lab-shared/utils';
import { IconMicrophone, IconVideo } from 'kovaa-lab-ui/icon';

import { type PermissionSummaryItem } from '@/marketplace/utils/buildPermissionSummaryFromRoleManifest';

const buildApplicationCapabilityItem = (
  capability: ApplicationCapability,
): PermissionSummaryItem => {
  switch (capability) {
    case 'microphone':
      return { Icon: IconMicrophone, label: t`Use your microphone` };
    case 'camera':
      return { Icon: IconVideo, label: t`Use your camera` };
    default:
      return assertUnreachable(capability);
  }
};

export const buildApplicationCapabilitySummary = (
  requestedCapabilities: string[],
): PermissionSummaryItem[] =>
  requestedCapabilities
    .filter(isApplicationCapability)
    .map(buildApplicationCapabilityItem);
