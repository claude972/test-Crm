import { type HermesPayloadProblem } from '@/prospection/types/HermesImportState';
import { type HermesCallFailure } from '@/prospection/utils/readHermesCallFailure';

// The outcome of one Hermes call, kept as five distinct cases. A call that
// answered with a payload this screen could not read is not a success, and a
// refused call is not an empty result.
export type HermesCallOutcome<TResult> =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'read'; result: TResult }
  | { kind: 'unreadable'; problem: HermesPayloadProblem }
  | { kind: 'failed'; failure: HermesCallFailure };
