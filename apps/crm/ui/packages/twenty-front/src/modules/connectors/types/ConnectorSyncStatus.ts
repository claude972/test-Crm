// Presentation vocabulary for the shared views, not a backend DTO. The
// integration contract requires Codex to publish the server-compatible types
// before Claude consumes them; this maps onto them later without assuming them.
export type ConnectorSyncStatus =
  | 'not-configured'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'unavailable';
