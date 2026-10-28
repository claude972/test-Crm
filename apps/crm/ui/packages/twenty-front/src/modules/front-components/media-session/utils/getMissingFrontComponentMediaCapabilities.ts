import { type MediaSessionMediaType } from 'kovaa-lab-front-component-renderer';
import { type ApplicationCapability } from 'kovaa-lab-shared/application';

export const getMissingFrontComponentMediaCapabilities = ({
  grantedCapabilities,
  mediaTypes,
}: {
  grantedCapabilities: string[];
  mediaTypes: MediaSessionMediaType[];
}): ApplicationCapability[] => {
  const requestedCapabilities: ApplicationCapability[] = [];

  if (mediaTypes.includes('audio')) {
    requestedCapabilities.push('microphone');
  }

  if (mediaTypes.includes('video')) {
    requestedCapabilities.push('camera');
  }

  return requestedCapabilities.filter(
    (capability) => !grantedCapabilities.includes(capability),
  );
};
