import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import {
  type HermesSenderIdentityAuthorization,
  type HermesSenderIdentityRefusalCode,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';

const normaliseAddress = (address: string | null): string | null => {
  if (!isDefined(address)) {
    return null;
  }

  const trimmed = address.trim().toLowerCase();

  return trimmed.length === 0 ? null : trimmed;
};

const refuse = (
  code: HermesSenderIdentityRefusalCode,
  identity: HermesSenderIdentity,
): HermesSenderIdentityAuthorization => ({
  allowed: false,
  code,
  serverReasonCode: identity.serverVerdict?.reasonCode ?? null,
  serverReason: identity.serverVerdict?.reason ?? null,
});

// Decides whether an identity may be offered as the sender of an emission.
// Restrictive only: it can refuse what the server allowed, never the reverse,
// and an absent fact refuses. The order of the checks is the order of the
// causes, so the refusal shown is the nearest one.
export const readSenderIdentityAuthorization = (
  identity: HermesSenderIdentity,
): HermesSenderIdentityAuthorization => {
  const verdict = identity.serverVerdict;

  // No verdict is not a yes. An unverified right is an unavailable right.
  if (!isDefined(verdict)) {
    return refuse('SERVER_VERDICT_MISSING', identity);
  }

  if (verdict.allowed === null) {
    return refuse('SERVER_VERDICT_UNREADABLE', identity);
  }

  if (verdict.allowed === false) {
    return refuse('SERVER_REFUSED', identity);
  }

  // From here the server said yes. The checks below can only take that back.

  if (identity.state === null) {
    return refuse('IDENTITY_STATE_UNKNOWN', identity);
  }

  if (identity.state === 'revoked') {
    return refuse('IDENTITY_REVOKED', identity);
  }

  if (identity.state === 'unverified') {
    return refuse('IDENTITY_NOT_VERIFIED', identity);
  }

  const mailbox = identity.delegatedMailbox;

  // The whole point of the four separate facts: the right domain, a plausible
  // address and a working login still add up to nothing without a delegation
  // on the exact mailbox.
  if (!isDefined(mailbox) || mailbox.delegated === false) {
    return refuse('MAILBOX_NOT_DELEGATED', identity);
  }

  if (mailbox.delegated === null) {
    return refuse('MAILBOX_DELEGATION_UNKNOWN', identity);
  }

  const displayedAddress = normaliseAddress(identity.displayedAddress);

  if (!isDefined(displayedAddress)) {
    return refuse('DISPLAYED_ADDRESS_MISSING', identity);
  }

  const mailboxAddress = normaliseAddress(mailbox.address);
  const authorizedAliases = identity.authorizedAliases
    .map(normaliseAddress)
    .filter((alias): alias is string => isDefined(alias));

  const authorizedAddresses = isDefined(mailboxAddress)
    ? [mailboxAddress, ...authorizedAliases]
    : authorizedAliases;

  // An alias outside the explicit list is refused even inside the right
  // domain, and the domain is never consulted to make up for a missing entry.
  if (!authorizedAddresses.includes(displayedAddress)) {
    return refuse('DISPLAYED_ADDRESS_NOT_AUTHORIZED', identity);
  }

  const replyToAddress = normaliseAddress(identity.replyToAddress);

  // No reply-to is not a problem: replies then go to the From address.
  if (
    isDefined(replyToAddress) &&
    !authorizedAddresses.includes(replyToAddress)
  ) {
    return refuse('REPLY_TO_NOT_AUTHORIZED', identity);
  }

  return { allowed: true };
};
