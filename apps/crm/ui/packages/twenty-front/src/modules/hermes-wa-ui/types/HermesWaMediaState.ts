// A media's lifecycle. READY is the only state that may be rendered; every
// other one gets its own sentence on screen. QUARANTINED is a decision and
// EXPIRED is a lapsed access, so they are never merged into one failure.
// A value outside the set stays unknown, and unknown is not ready.
export const HERMES_WA_MEDIA_STATES = [
  'PENDING_FETCH',
  'UPLOADING',
  'PROCESSING',
  'READY',
  'FAILED',
  'QUARANTINED',
  'EXPIRED',
] as const;

export type HermesWaMediaState = (typeof HERMES_WA_MEDIA_STATES)[number];

export const isHermesWaMediaState = (
  value: unknown,
): value is HermesWaMediaState =>
  typeof value === 'string' &&
  (HERMES_WA_MEDIA_STATES as readonly string[]).includes(value);

export type HermesWaMediaStateRead =
  | { kind: 'known'; state: HermesWaMediaState }
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaMediaState = (
  value: unknown,
): HermesWaMediaStateRead => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (isHermesWaMediaState(normalised)) {
    return { kind: 'known', state: normalised };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};
