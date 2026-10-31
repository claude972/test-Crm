import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';

import {
  HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  type HermesWaCapability,
} from '@/hermes-wa-ui/types/HermesWaCapability';

// Which of a connection's capability flags to read. They are separate
// questions with separate answers, and the server computes each one from a real
// configuration — so each is read on its own and none is derived from another
// or from the connection state.
export type HermesWaCapabilityName =
  | 'canSend'
  | 'canSendMedia'
  | 'canReceiveMedia'
  | 'canRecordVoice';

// One capability, from the connection read.
//
// Nothing here infers. The mapping is:
//   loading / unknown — nobody has confirmed anything yet, so the capability
//                       is unavailable. It is NOT reported as not configured:
//                       a read that failed says nothing about whether a
//                       provider exists, and sending the operator to the setup
//                       screen over a network hiccup is the wrong advice.
//   absent            — the contract's NOT_CONFIGURED. No synthetic connection
//                       is built, and the library has a sentence for it.
//   reported          — the flag the server published, and only `true` opens
//                       the capability. The server derives each media flag from
//                       what the authenticated instance itself reported — the
//                       pinned build, and for reception the instance's own
//                       webhook configuration — so an unconfigured or incapable
//                       provider still publishes false, and the reader defaults
//                       an absent flag to false.
//
// AVAILABLE is never read as a capability either. It is the only
// provider-confirmed state, but it is a state, not a permission, and
// CONFIGURED_UNVERIFIED is not a connection.
export const toHermesWaCapability = (
  read: MessagingInboxConnectionRead,
  name: HermesWaCapabilityName,
): HermesWaCapability => {
  if (read.kind === 'loading' || read.kind === 'unknown') {
    return { kind: 'unavailable', reason: null };
  }

  if (read.kind === 'absent') {
    return HERMES_WA_NOT_CONFIGURED_CAPABILITY;
  }

  const flag =
    name === 'canSend'
      ? read.connection.canSend
      : name === 'canSendMedia'
        ? read.connection.canSendMedia
        : name === 'canReceiveMedia'
          ? read.connection.canReceiveMedia
          : read.connection.canRecordVoice;

  if (flag === true) {
    return { kind: 'available' };
  }

  // The server's own diagnostic when it published one. Shown as a reason,
  // never turned into an outcome.
  return { kind: 'unavailable', reason: read.connection.errorCode };
};
