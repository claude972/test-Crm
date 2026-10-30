import { type ClientContextSourceState } from '@/client-context/types/ClientContextSourceState';
import { type ProspectionCount } from '@/prospection/types/ProspectionCount';
import {
  exactProspectionCount,
  loadingProspectionCount,
  unavailableProspectionCount,
} from '@/prospection/utils/buildProspectionCount';

// How many items one source holds for this record, in the four-state counter
// vocabulary of the prospection module.
//
// Only a source that was read has an exact figure. Every other state carries
// no value: a source still loading, a source whose contract is not published,
// a refused one and an unreadable one are four different unknowns, and none of
// them is a zero. A zero here would tell the reader the client has no Forms
// response when the truth is that nobody has looked.
export const buildClientContextSourceCount = <TEntry>(
  state: ClientContextSourceState<TEntry>,
): ProspectionCount =>
  state.kind === 'read'
    ? exactProspectionCount(state.entries.length)
    : state.kind === 'loading'
      ? loadingProspectionCount()
      : unavailableProspectionCount();
