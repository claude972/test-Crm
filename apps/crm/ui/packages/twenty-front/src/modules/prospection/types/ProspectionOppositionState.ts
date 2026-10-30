// Read-only outcome of comparing a received address with the workspace
// opt-out register. The front never writes that register, so there is no
// state here for lifting an opt-out.
export type ProspectionOppositionState = 'opted-out' | 'reachable' | 'unknown';

// How much of the opt-out register this session could read. Anything other
// than 'complete' means an address absent from the register is unknown, not
// reachable.
export type ProspectionOppositionCoverage =
  | 'complete'
  | 'partial'
  | 'unavailable';
