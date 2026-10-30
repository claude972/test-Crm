// One mail address as a provider published it.
//
// `display` and `email` are kept apart on purpose. A provider may send a
// display name with no address ("Accounting"), an address with no name, or a
// single unparsed string. None of those is turned into the other: an address
// this client could not isolate stays `null`, and a header with no usable
// address cannot be replied to rather than being replied to at a guess.
//
// `raw` is what came in, kept verbatim so a header can still be shown to a
// human even when nothing in it could be read.
export type HermesMailboxAddress = {
  display: string | null;
  email: string | null;
  raw: string;
};

// The Bcc header, which is the one header this module refuses to show on its
// own initiative.
//
// Per the contract, the server discloses a Bcc list to the mailbox's owner and
// to nobody else, so the three cases are three different facts:
//
// - 'disclosed': this reader is the owner and the server sent the list. Only
//   then is it rendered.
// - 'ownerOnly': the list exists and this reader is not the owner. Said in
//   those words, so the absence reads as a rule rather than as a gap.
// - 'unknown': the server said nothing about it. Not the same fact as an
//   empty Bcc, and never shown as one.
export type HermesMailboxBcc =
  | { kind: 'disclosed'; addresses: HermesMailboxAddress[] }
  | { kind: 'ownerOnly' }
  | { kind: 'unknown' };
