import { isNonEmptyString } from '@sniptt/guards';

import { type HermesMailboxAddress } from '@/hermes-mailbox-ui/types/HermesMailboxAddress';

// Everything inside the angle brackets of 'Name <a@b.example>'.
const ANGLE_BRACKET_ADDRESS = /<([^<>]*)>/;

// Deliberately loose. This is not an RFC 5322 validator and must not be
// mistaken for one: it decides whether a string is usable as a reply target,
// and the server remains the authority on whether an address is deliverable.
// Being loose here is the safe direction — a bad address is refused later by
// something that knows, whereas a strict guess here would silently drop a
// correspondent and make a reply unanswerable.
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// Lower-cased form used for comparison only.
//
// The local part of an address is case-sensitive per the RFC, but every mail
// provider in practice folds it, and the alternative here is worse: treating
// 'Anne@example.com' and 'anne@example.com' as two people would put our own
// mailbox back in a reply's recipients, which is the one thing the reply
// computation exists to prevent. The displayed address is always the original.
export const normalizeHermesMailboxEmail = (
  value: string | null | undefined,
): string | null => {
  const trimmed = value?.trim().toLowerCase();

  return isNonEmptyString(trimmed) ? trimmed : null;
};

// Reduces one header entry to a display name and an address.
//
// A string with no readable address keeps its text as `display` and leaves
// `email` null, so a header can still be shown while staying un-repliable.
export const parseHermesMailboxAddress = (
  value: string | null | undefined,
): HermesMailboxAddress | null => {
  const raw = value?.trim();

  if (!isNonEmptyString(raw)) {
    return null;
  }

  const bracketed = ANGLE_BRACKET_ADDRESS.exec(raw);

  if (bracketed !== null) {
    const inner = bracketed[1].trim();
    // Quotes are common around a display name that contains a comma.
    const display = raw.slice(0, bracketed.index).trim().replace(/^"|"$/g, '');

    return {
      display: isNonEmptyString(display) ? display : null,
      email: LOOKS_LIKE_AN_ADDRESS.test(inner) ? inner : null,
      raw,
    };
  }

  if (LOOKS_LIKE_AN_ADDRESS.test(raw)) {
    return { display: null, email: raw, raw };
  }

  return { display: raw, email: null, raw };
};

// Splits an editable 'a@b, c@d' field into one entry per address.
//
// Commas inside a quoted display name would split wrongly here, which is why
// the editor's own fields hold one plain address per entry and this helper is
// only used on what a person typed into them. It never silently repairs: an
// entry that is not an address survives as text, and the editor marks it.
export const splitHermesMailboxAddressList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const isHermesMailboxAddressUsable = (value: string): boolean =>
  LOOKS_LIKE_AN_ADDRESS.test(value.trim());

// How an address is written on screen. The display name alone is not enough —
// a display name is attacker-controlled in received mail, so the address is
// always shown next to it rather than standing behind it.
export const formatHermesMailboxAddress = (
  address: HermesMailboxAddress,
): string => {
  if (isNonEmptyString(address.display) && isNonEmptyString(address.email)) {
    return `${address.display} <${address.email}>`;
  }

  return address.email ?? address.display ?? address.raw;
};
