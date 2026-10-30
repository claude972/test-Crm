import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

// WHAT THIS SURFACE NEEDS, NOT WHAT THE SERVER PUBLISHES.
//
// Collections reach a workspace through an authenticated entry point. That
// entry point has NO published contract: there is no operation name, no field
// name and no status set to read. Nothing below was taken off a wire, and
// nothing in this module queries anything for it.
//
// Every field here is therefore a requirement, written down so the surface
// could be built against it and so the contract can be published against
// something precise. Until it is published, useHermesIntakeState returns
// 'awaiting-contract' and that is the only state this screen can reach — an
// entry point whose contract is missing is neither configured nor broken, and
// the surface says so in those words.
export type HermesIntakeEndpoint = {
  // The entry point's identifier in this workspace. Null when the payload
  // carried none: an unnamed entry point is not an absent one.
  id: string | null;
  // The server's own wording for where collections come in. Shown as a label,
  // never parsed into a status and never rendered as markup.
  label: string | null;
  // Whether the server considers the entry point able to accept a collection.
  // Null means the server did not say, and an unknown capability is never
  // read as true.
  isAccepting: boolean | null;
  // When a collection last came in through it. Null means never, which is not
  // the same as a healthy entry point.
  lastCollectionAt: string | null;
  // Provider diagnostics, folded away behind the state. Untrusted text.
  providerState: string | null;
  errorCode: string | null;
};

// What the client actually knows about the entry point, as opposed to what the
// entry point is. Six cases that must never collapse into one:
//
// - 'awaiting-contract' is the client's own gap, not the workspace's;
// - 'denied' is an authorisation answer, not a failure;
// - 'not-configured' is a fact the server stated;
// - 'unreadable' is an absence of knowledge and never reads as 'not-configured';
// - only 'reported' carries an endpoint, and its isAccepting may still be null.
export type HermesIntakeReadState =
  | { kind: 'awaiting-contract' }
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'reported'; endpoint: HermesIntakeEndpoint };
