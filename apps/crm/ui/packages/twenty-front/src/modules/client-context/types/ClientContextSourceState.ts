import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

// What the client knows about one source of record context, as opposed to what
// the source holds. Six cases that must never collapse into one:
//
// - 'awaiting-contract' is the client's own gap. No contract is published for
//   Forms responses or Cal.diy bookings, so nothing is queried and the surface
//   says that rather than showing an empty record;
// - 'loading' carries nothing yet and is not an empty source;
// - 'denied' is an authorisation answer, not a failure;
// - 'not-configured' is a fact the server stated about the workspace;
// - 'unreadable' is an absence of knowledge and never reads as 'read' with no
//   entries;
// - only 'read' carries entries, and an empty entries array then means the
//   source genuinely holds nothing for this record.
//
// HermesPayloadProblem is reused rather than copied: the prospection surface
// already names the four ways a payload can fail to be read, and a second
// vocabulary for the same facts would drift from it.
export type ClientContextSourceState<TEntry> =
  | { kind: 'awaiting-contract' }
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'read'; entries: TEntry[] };
