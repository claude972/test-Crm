// The order the sidebar lists record objects in, by nameSingular. It is a
// reading order, not a whitelist of what exists: an object absent from the
// workspace metadata is simply not listed, and any other readable object is
// appended after these in its own metadata order.
export const HERMES_RECORD_NAVIGATION_ORDER = [
  'company',
  'person',
  'opportunity',
  'task',
  'note',
] as const;
