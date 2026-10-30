// Where one item on a client record came from, and what the workspace knows
// about its journey.
//
// WHAT THIS SURFACE NEEDS, NOT WHAT THE SERVER PUBLISHES. No contract exists
// for Forms responses or for Cal.diy bookings, so no field below was read off
// a wire. They are the requirements these components were written against, so
// the contract can be published against something precise.
//
// The rule the integration contract states, and the reason this type exists at
// all: a link to Forms or to Cal.diy is navigation, not an integration. Only
// an item this workspace actually received may appear on a record, and it
// appears with its provenance attached.
export type ClientContextProvenance = {
  // The application the item was received from, as the server identifies it.
  // Null when the payload carried none: an unattributed item is shown as
  // unattributed, never as belonging to the section it happens to sit in.
  sourceId: string | null;
  // The server's own wording for that application. Shown as a label, never
  // parsed and never rendered as markup.
  sourceLabel: string | null;
  // The item's identifier inside that application, so a row on the record can
  // be matched against the source by a human.
  externalId: string | null;
  // When THIS workspace received the item. Distinct from when the item
  // happened: a response submitted on Monday and received on Wednesday is two
  // facts, and collapsing them would hide a lagging intake.
  receivedAt: string | null;
};
