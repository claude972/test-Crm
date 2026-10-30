import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';

// What the client knows about one source of record context, as opposed to what
// the source holds. Six cases that must never collapse into one:
//
// - 'recorded-in-notes' is neither a gap nor a wait: that stream's items are
//   held in CRM notes rather than in a stream of their own, so there is no
//   separate list to read and the surface says where they are. It replaced an
//   'awaiting-contract' state that promised a contract which is not coming,
//   and a section waiting forever is a screen that lies by omission;
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
  | { kind: 'recorded-in-notes' }
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'not-configured' }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'read'; entries: TEntry[] };
