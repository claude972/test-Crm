import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCampaignCapability,
  type HermesCampaignCapabilityName,
  type HermesCampaignPermission,
} from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesSenderIdentityAuthorization } from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';

// The capabilities that end up putting a message on a transport under the
// chosen identity: a refused identity refuses all three. Preview is absent
// because it emits nothing, and cancel because stopping an avoidable
// departure has to stay reachable exactly when an identity was revoked.
export const HERMES_IDENTITY_BOUND_CAPABILITIES: readonly HermesCampaignCapabilityName[] =
  ['testSynthetic', 'schedule', 'send'];

export const isHermesIdentityBoundCapability = (
  name: HermesCampaignCapabilityName,
): boolean => HERMES_IDENTITY_BOUND_CAPABILITIES.includes(name);

type ReadCampaignCapabilityArgs = {
  name: HermesCampaignCapabilityName;
  // Null when the server published no entry for this capability at all.
  capability: HermesCampaignCapability | null;
  // The verdict on the identity the action would run under. Null when no
  // identity is chosen yet.
  identityAuthorization: HermesSenderIdentityAuthorization | null;
};

// Turns a published capability into what the interface may do.
//
// Only `allowed === true` opens a control. A false opens nothing and says
// why; a null opens nothing and says that nothing is known. Neither one is
// ever rounded up, and no name, pilot flag or feature toggle is consulted.
export const readCampaignCapability = ({
  name,
  capability,
  identityAuthorization,
}: ReadCampaignCapabilityArgs): HermesCampaignPermission => {
  if (!isDefined(capability) || capability.allowed === null) {
    return { kind: 'unknown' };
  }

  if (capability.allowed === false) {
    return {
      kind: 'refused',
      origin: 'server',
      reasonCode: capability.reasonCode,
      reason: capability.reason,
    };
  }

  if (!isHermesIdentityBoundCapability(name)) {
    return { kind: 'allowed' };
  }

  // The server allowed the capability, but an emission also needs an identity
  // that may actually carry it.
  if (!isDefined(identityAuthorization)) {
    return { kind: 'unknown' };
  }

  if (identityAuthorization.allowed === false) {
    return {
      kind: 'refused',
      origin: 'sender-identity',
      reasonCode:
        identityAuthorization.serverReasonCode ?? identityAuthorization.code,
      reason: identityAuthorization.serverReason,
    };
  }

  return { kind: 'allowed' };
};
