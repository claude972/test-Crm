// The four media shapes a thread can carry. The value arrives as a String,
// so anything outside the set stays unknown and is never guessed into one of
// the four: a guessed kind picks the wrong renderer.
export const HERMES_WA_MEDIA_KINDS = [
  'IMAGE',
  'VIDEO',
  'VOICE',
  'FILE',
] as const;

export type HermesWaMediaKind = (typeof HERMES_WA_MEDIA_KINDS)[number];

export const isHermesWaMediaKind = (
  value: unknown,
): value is HermesWaMediaKind =>
  typeof value === 'string' &&
  (HERMES_WA_MEDIA_KINDS as readonly string[]).includes(value);

// The unknown case keeps the server's own word, so the gap is reportable.
export type HermesWaMediaKindRead =
  | { kind: 'known'; mediaKind: HermesWaMediaKind }
  | { kind: 'unknown'; raw: string | null };

export const readHermesWaMediaKind = (
  value: unknown,
): HermesWaMediaKindRead => {
  if (typeof value !== 'string') {
    return { kind: 'unknown', raw: null };
  }

  const trimmed = value.trim();
  const normalised = trimmed.toUpperCase();

  if (isHermesWaMediaKind(normalised)) {
    return { kind: 'known', mediaKind: normalised };
  }

  return { kind: 'unknown', raw: trimmed.length > 0 ? trimmed : null };
};
