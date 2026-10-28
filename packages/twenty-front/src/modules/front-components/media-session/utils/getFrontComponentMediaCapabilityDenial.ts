import { getMissingFrontComponentMediaCapabilities } from '@/front-components/media-session/utils/getMissingFrontComponentMediaCapabilities';
import { t } from '@lingui/core/macro';
import {
  type MediaSessionMediaType,
  type MediaSessionStartVeto,
} from 'kovaa-lab-front-component-renderer';
import { isDefined } from 'kovaa-lab-shared/utils';

export const getFrontComponentMediaCapabilityDenial = ({
  grantedCapabilities,
  mediaTypes,
}: {
  grantedCapabilities: string[];
  mediaTypes: MediaSessionMediaType[];
}): MediaSessionStartVeto | null => {
  const [missingCapability] = getMissingFrontComponentMediaCapabilities({
    grantedCapabilities,
    mediaTypes,
  });

  if (!isDefined(missingCapability)) {
    return null;
  }

  return {
    errorName: 'NotAllowedError',
    errorMessage: t`This application does not have ${missingCapability} access`,
  };
};
