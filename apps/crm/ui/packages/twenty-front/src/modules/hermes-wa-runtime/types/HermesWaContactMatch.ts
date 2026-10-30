// How the server attached this conversation to a CRM contact.
//
// The attachment is read-only on the server side: this client never creates a
// link, never merges two contacts and never recomputes a match. The three
// published values are the whole vocabulary, and the field travels as a String,
// so anything else stays unknown and keeps the server's own word.
//
// AMBIGUOUS is deliberately not a reason to create a contact: the conversation
// could belong to more than one, so the only honest next step is a review.
export const HERMES_WA_CONTACT_MATCH_STATUSES = [
  'MATCHED',
  'UNMATCHED',
  'AMBIGUOUS',
] as const;

export type HermesWaContactMatchStatus =
  (typeof HERMES_WA_CONTACT_MATCH_STATUSES)[number];

export const isHermesWaContactMatchStatus = (
  value: unknown,
): value is HermesWaContactMatchStatus =>
  typeof value === 'string' &&
  (HERMES_WA_CONTACT_MATCH_STATUSES as readonly string[]).includes(value);

export type HermesWaContactMatchRead =
  | { kind: 'known'; status: HermesWaContactMatchStatus }
  // An unpublished value, and an absent one, both read as unknown. Unknown is
  // not UNMATCHED: "we do not know" and "there is no contact" lead to
  // different next steps, so they are never merged.
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaContactMatch = (
  value: unknown,
): HermesWaContactMatchRead => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (isHermesWaContactMatchStatus(normalised)) {
    return { kind: 'known', status: normalised };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};

// What the CRM inspector may offer for one conversation.
//
// `open` is the only action for a contact the server already attached. `create`
// is offered for UNMATCHED alone, and it opens the native Person form — it
// never writes a link itself. `review` is offered for AMBIGUOUS: a creation
// there would be a guess between two real people.
//
// `none` covers the unknown status and a conversation with no handle to
// prefill: no action is better than an action whose outcome this client cannot
// describe.
export type HermesWaContactAction =
  | { kind: 'open'; personId: string }
  | { kind: 'create'; phoneNumber: string }
  | { kind: 'review' }
  | { kind: 'none' };

// The inspector's whole read of one conversation's contact: who it is, where
// that answer came from, and what may be done about it.
export type HermesWaContactRead = {
  personId: string | null;
  match: HermesWaContactMatchRead;
  // The provider handle the match was made from. For WhatsApp this is the
  // phone number, and it is what prefills the native Person form.
  handle: string | null;
  action: HermesWaContactAction;
};

// The inspector's decision, in one place.
//
// A linked person wins over the status: a conversation the server attached is
// attached, whatever word it used for how. Beyond that, only UNMATCHED with a
// handle earns a creation; AMBIGUOUS earns a review; everything else earns
// nothing.
export const readHermesWaContact = ({
  personId,
  personMatchStatus,
  contactHandle,
}: {
  personId: string | null;
  personMatchStatus: string | null;
  contactHandle: string | null;
}): HermesWaContactRead => {
  const match = readHermesWaContactMatch(personMatchStatus);
  const handle =
    typeof contactHandle === 'string' && contactHandle.trim().length > 0
      ? contactHandle.trim()
      : null;

  const action = ((): HermesWaContactAction => {
    if (personId !== null && personId.length > 0) {
      return { kind: 'open', personId };
    }

    if (match.kind === 'known' && match.status === 'AMBIGUOUS') {
      return { kind: 'review' };
    }

    if (
      match.kind === 'known' &&
      match.status === 'UNMATCHED' &&
      handle !== null
    ) {
      return { kind: 'create', phoneNumber: handle };
    }

    return { kind: 'none' };
  })();

  return { personId, match, handle, action };
};
