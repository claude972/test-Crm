// Mirrors the HermesStructureMetricStatus enum of
// docs/handoff/hermes-structure-dashboard-api.md. FORBIDDEN and UNAVAILABLE
// both carry a null value and must never be rendered as zero; an AVAILABLE
// zero is a real count.
export type HermesStructureMetricStatus =
  | 'AVAILABLE'
  | 'FORBIDDEN'
  | 'UNAVAILABLE'
  | 'PARTIAL';
