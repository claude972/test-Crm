// Presentation vocabulary for the reception and qualification screens, not a
// backend DTO. A figure is exact, computed over part of the rows, still being
// read, or not known at all — the four cases must never collapse into one
// number, and none of them is a zero.
export type ProspectionCountStatus =
  | 'exact'
  | 'partial'
  | 'loading'
  | 'unavailable';
