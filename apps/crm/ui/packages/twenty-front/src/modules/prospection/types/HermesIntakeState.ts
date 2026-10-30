import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

// The automatic Hermes intake, as the frontend is allowed to know it.
//
// WHAT THE TRANSPORT IS, published and fixed:
//   POST /webhooks/hermes/intake/:connectionId
//   authenticated by a strong HMAC signature plus a nonce with a TTL,
//   delegated per structure.
//
// WHAT THAT MEANS HERE. It is a server-to-server endpoint. The browser never
// calls it, so this module holds no client for it, no URL builder and no test
// action. And the credential side of it must not exist in the frontend at all:
//
//   - NO HMAC secret, signing key or shared secret may appear in any payload
//     this module reads, be rendered, be stored, or be offered for generation.
//   - NO nonce, no signature and no TTL value either: they are transport
//     facts between two servers, and showing them would invite someone to
//     reproduce a call the browser must not make.
//   - the full webhook URL is not rendered: an operator who needs it gets it
//     from the structure's configuration, not from a CRM screen.
//
// WHAT THE SCREEN MAY LEGITIMATELY SHOW, and all it shows: that an entry point
// exists for a structure, the state the server reports for it, when it last
// received something, and the provenance of the collections that came in.
//
// THE QUERY IS STILL UNPUBLISHED. No operation name, no field name below was
// read off a wire; they are the requirements this surface was built against.
// Until the query exists, useHermesIntakeState returns 'awaiting-contract'.
export type HermesIntakeEndpoint = {
  // The :connectionId path segment, carried as the list key ONLY and never
  // rendered. It is not a credential — it is useless without a signature the
  // browser cannot produce — but it is not in the set of facts this screen is
  // allowed to display either, so it stays off the page.
  connectionId: string | null;
  // The structure the entry point is delegated to. This is the identity the
  // screen does show, because delegation is per structure.
  structureId: string | null;
  structureName: string | null;
  // The server's own wording for the entry point. Shown as a label, never
  // parsed into a status and never rendered as markup.
  label: string | null;
  // Whether the server considers the entry point able to accept a collection.
  // Null means the server did not say, and an unknown capability is never
  // read as true.
  isAccepting: boolean | null;
  // When a collection last came in through it. Null means never, which is not
  // the same as a healthy entry point.
  lastCollectionAt: string | null;
  // Diagnostics, folded away behind the state. Untrusted text, and never a
  // secret: see the header.
  providerState: string | null;
  errorCode: string | null;
};

// What the client actually knows, as opposed to what the intake is. Six cases
// that must never collapse into one:
//
// - 'awaiting-contract' is the client's own gap, not the workspace's;
// - 'denied' is an authorisation answer, not a failure;
// - 'not-configured' is a fact the server stated: no structure has an entry
//   point delegated to it;
// - 'unreadable' is an absence of knowledge and never reads as 'not-configured';
// - only 'reported' carries endpoints, one per structure, and each one's
//   isAccepting may still be null.
export type HermesIntakeReadState =
  | { kind: 'awaiting-contract' }
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'reported'; endpoints: HermesIntakeEndpoint[] };

// Every case except 'reported': what the client knows when it does not have an
// entry point to show. Kept as its own type so the badge that renders these
// five cannot be handed a 'reported' state it has no endpoint for, and so the
// acceptance of a reported endpoint is a separate badge with a separate
// vocabulary.
export type HermesIntakeUnreportedState = Exclude<
  HermesIntakeReadState,
  { kind: 'reported' }
>;
