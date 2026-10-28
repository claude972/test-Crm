import { getFrontComponentMediaCapabilityDenial } from '@/front-components/media-session/utils/getFrontComponentMediaCapabilityDenial';
import {
  type MediaSessionMediaType,
  type MediaSessionStartVeto,
} from 'kovaa-lab-front-component-renderer';
import { isDefined } from 'kovaa-lab-shared/utils';

export const createFrontComponentMediaCapabilityPolicy =
  ({
    getGrantedCapabilities,
    requestApproval,
  }: {
    getGrantedCapabilities: () => string[];
    requestApproval: (input: {
      mediaTypes: MediaSessionMediaType[];
      abortSignal: AbortSignal;
    }) => Promise<string[]>;
  }) =>
  async ({
    mediaTypes,
    abortSignal,
  }: {
    mediaTypes: MediaSessionMediaType[];
    abortSignal: AbortSignal;
  }): Promise<MediaSessionStartVeto | null> => {
    const denial = getFrontComponentMediaCapabilityDenial({
      grantedCapabilities: getGrantedCapabilities(),
      mediaTypes,
    });

    if (!isDefined(denial) || abortSignal.aborted) {
      return denial;
    }

    const grantedCapabilities = await requestApproval({
      mediaTypes,
      abortSignal,
    });

    return getFrontComponentMediaCapabilityDenial({
      grantedCapabilities,
      mediaTypes,
    });
  };
