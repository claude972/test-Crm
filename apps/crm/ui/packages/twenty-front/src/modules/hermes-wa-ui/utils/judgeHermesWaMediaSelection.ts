import { isHermesWaMimeTypeAccepted } from '@/hermes-wa-ui/utils/readHermesWaMimeKind';
import { stripHermesWaMimeParameters } from '@/hermes-wa-ui/utils/stripHermesWaMimeParameters';

// What one channel allows, as the caller knows it. A null field does NOT mean
// "no limit": it means the limit is unknown here, so the verdict is
// `undecidable` and the composer keeps its send closed.
// The per-type map exists because the documented ceilings are not uniform —
// images are allowed less than video and audio.
export type HermesWaMediaLimits = {
  acceptedMimeTypes: readonly string[] | null;
  // The ceiling for an accepted type with no entry of its own below.
  maxByteSize: number | null;
  // Per-type ceilings, which win over `maxByteSize`.
  maxByteSizeByMimeType: Readonly<Record<string, number>> | null;
};

// A File satisfies this: the pure decision never needs the bytes.
export type HermesWaSelectedFileFacts = {
  name: string;
  byteSize: number;
  mimeType: string;
};

export type HermesWaMediaSelectionVerdict =
  | { kind: 'accepted'; maxByteSize: number }
  | {
      kind: 'refused';
      reason: 'empty' | 'tooLarge' | 'unacceptedType';
      // The two numbers the refusal sentence needs, when the refusal is
      // about size. Null for the other reasons.
      byteSize: number | null;
      maxByteSize: number | null;
    }
  | {
      kind: 'undecidable';
      reason: 'maxByteSizeUnknown' | 'acceptedTypesUnknown';
    };

// The ceiling that applies to one type: its own entry, else the default.
const resolveMaxByteSize = (
  mimeType: string,
  limits: HermesWaMediaLimits,
): number | null => {
  const perType = limits.maxByteSizeByMimeType?.[mimeType];

  if (typeof perType === 'number' && Number.isFinite(perType)) {
    return perType;
  }

  if (
    typeof limits.maxByteSize === 'number' &&
    Number.isFinite(limits.maxByteSize)
  ) {
    return limits.maxByteSize;
  }

  return null;
};

// Whether a locally chosen file may be offered for sending. Nothing here
// touches the network; the server stays the authority and can still refuse a
// file this accepted. An empty file is refused before any limit is consulted,
// and the type before the size, since the per-type ceiling needs the type.
export const judgeHermesWaMediaSelection = (
  file: HermesWaSelectedFileFacts,
  limits: HermesWaMediaLimits,
): HermesWaMediaSelectionVerdict => {
  if (!Number.isFinite(file.byteSize) || file.byteSize <= 0) {
    return {
      kind: 'refused',
      reason: 'empty',
      byteSize: null,
      maxByteSize: null,
    };
  }

  if (limits.acceptedMimeTypes === null) {
    return { kind: 'undecidable', reason: 'acceptedTypesUnknown' };
  }

  // The browser can report a type with parameters, and the contract refuses
  // one. Compared on its essence, so a file is not refused for a `;codecs=`
  // the person never chose.
  const mimeType = stripHermesWaMimeParameters(file.mimeType);

  if (!isHermesWaMimeTypeAccepted(mimeType, limits.acceptedMimeTypes)) {
    return {
      kind: 'refused',
      reason: 'unacceptedType',
      byteSize: null,
      maxByteSize: null,
    };
  }

  const maxByteSize = resolveMaxByteSize(mimeType, limits);

  if (maxByteSize === null) {
    return { kind: 'undecidable', reason: 'maxByteSizeUnknown' };
  }

  if (file.byteSize > maxByteSize) {
    return {
      kind: 'refused',
      reason: 'tooLarge',
      byteSize: file.byteSize,
      maxByteSize,
    };
  }

  return { kind: 'accepted', maxByteSize };
};
