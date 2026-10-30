// A figure this client is willing to print.
//
// Anything that is not a finite, non-negative whole number becomes unknown
// rather than being rounded or clamped into one: an operator who reads
// "0 unread" stops looking, so a count nobody sent must never become zero.
export type HermesMailboxCount =
  | { kind: 'unknown' }
  | { kind: 'known'; value: number };

export const readHermesMailboxCount = (
  value: number | null | undefined,
): HermesMailboxCount =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  Number.isFinite(value)
    ? { kind: 'known', value }
    : { kind: 'unknown' };

// A file size reduced to a value and an Intl unit, so the number and its unit
// are localised together instead of glued to a translated word. A real 0-byte
// file is a known size and is not folded into "unknown".
export type HermesMailboxFileSize =
  | { kind: 'unknown' }
  | {
      kind: 'known';
      value: number;
      unit: 'byte' | 'kilobyte' | 'megabyte' | 'gigabyte';
    };

const KILOBYTE = 1000;
const MEGABYTE = KILOBYTE * 1000;
const GIGABYTE = MEGABYTE * 1000;

export const readHermesMailboxFileSize = (
  sizeBytes: number | null | undefined,
): HermesMailboxFileSize => {
  if (
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0
  ) {
    return { kind: 'unknown' };
  }

  if (sizeBytes >= GIGABYTE) {
    return {
      kind: 'known',
      value: Math.round((sizeBytes / GIGABYTE) * 10) / 10,
      unit: 'gigabyte',
    };
  }

  if (sizeBytes >= MEGABYTE) {
    return {
      kind: 'known',
      value: Math.round((sizeBytes / MEGABYTE) * 10) / 10,
      unit: 'megabyte',
    };
  }

  if (sizeBytes >= KILOBYTE) {
    return {
      kind: 'known',
      value: Math.round(sizeBytes / KILOBYTE),
      unit: 'kilobyte',
    };
  }

  return { kind: 'known', value: sizeBytes, unit: 'byte' };
};
