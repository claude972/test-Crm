import { isNonEmptyString } from '@sniptt/guards';

import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';

export type HermesSenderIdentitySelectability =
  | { selectable: true; address: string }
  | {
      selectable: false;
      // There is nothing to record: without an address the campaign's `From`
      // cannot be set to this identity at all.
      code: 'DISPLAYED_ADDRESS_MISSING';
    };

// Whether this identity can be *recorded* as the campaign's sender.
//
// This is deliberately not the same question as whether it may emit, and
// conflating the two was a dead end: every identity other than the one
// already on the campaign arrives with no server verdict, the emission
// authorisation refuses a missing verdict — correctly — and the radio was
// disabled on that basis. The result was a new draft with no `From` where no
// sender could be chosen at all, and an existing one whose sender could never
// be changed. The screen offered a choice that could never be made.
//
// Recording a sender is a write on the campaign record. It emits nothing, so
// it needs no emission right: it needs an address to write. The server is
// then asked again — the campaign is re-read and its blockers recomputed for
// the address that was actually stored — and that answer, not this one,
// decides whether a send may happen. `readSenderIdentityAuthorization` stays
// as strict as it was and still shuts every emitting step.
export const readSenderIdentitySelectability = (
  identity: HermesSenderIdentity,
): HermesSenderIdentitySelectability => {
  const address = identity.displayedAddress?.trim();

  return isNonEmptyString(address)
    ? { selectable: true, address }
    : { selectable: false, code: 'DISPLAYED_ADDRESS_MISSING' };
};
