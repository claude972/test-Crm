import { type HermesWaMediaLimits } from '@/hermes-wa-ui/utils/judgeHermesWaMediaSelection';

const MEBIBYTE = 1024 * 1024;

// The ceilings the published contract documents, in bytes.
const IMAGE_MAX_BYTE_SIZE = 5 * MEBIBYTE;
const VIDEO_MAX_BYTE_SIZE = 16 * MEBIBYTE;
const AUDIO_MAX_BYTE_SIZE = 16 * MEBIBYTE;

// Defaults for a composer's `limits` prop, not rules: no decision in this
// module reads this constant, and a caller with the real server figures
// overrides it. Exact types, no wildcard — `image/*` would admit SVG, which
// the contract refuses along with HTML and executables. The list is an
// allow-list, so those are out by not appearing; no deny-list can drift.
export const HERMES_WA_DOCUMENTED_MEDIA_LIMITS: HermesWaMediaLimits = {
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
  ],
  // Reached only by an accepted type with no entry below. The stricter
  // ceiling, so a type added above without one fails safe.
  maxByteSize: IMAGE_MAX_BYTE_SIZE,
  maxByteSizeByMimeType: {
    'image/jpeg': IMAGE_MAX_BYTE_SIZE,
    'image/png': IMAGE_MAX_BYTE_SIZE,
    'image/webp': IMAGE_MAX_BYTE_SIZE,
    'video/mp4': VIDEO_MAX_BYTE_SIZE,
    'audio/ogg': AUDIO_MAX_BYTE_SIZE,
    'audio/mpeg': AUDIO_MAX_BYTE_SIZE,
    'audio/mp4': AUDIO_MAX_BYTE_SIZE,
    'audio/webm': AUDIO_MAX_BYTE_SIZE,
  },
};
