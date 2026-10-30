import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import { type HermesWaMediaSource } from '@/hermes-wa-ui/types/HermesWaMediaSource';

// Why a media is not rendered. Each reason gets its own sentence, because the
// next move differs: retrying is right for an expired access and wrong for a
// quarantined file. The last three are about the source the parent resolved,
// which is a separate axis from the media's own lifecycle.
export const HERMES_WA_MEDIA_UNAVAILABLE_REASONS = [
  'pendingFetch',
  'uploading',
  'processing',
  'failed',
  'quarantined',
  'expired',
  'unknownState',
  'unknownKind',
  'sourceAbsent',
  'sourceResolving',
  'sourceExpired',
] as const;

export type HermesWaMediaUnavailableReason =
  (typeof HERMES_WA_MEDIA_UNAVAILABLE_REASONS)[number];

export type HermesWaMediaAvailability =
  // The blob: URL the parent made from bytes it fetched with the session
  // header. The only thing this module ever puts in a src.
  | { kind: 'renderable'; objectUrl: string }
  | { kind: 'unavailable'; reason: HermesWaMediaUnavailableReason };

const UNAVAILABLE_BY_STATE: Record<string, HermesWaMediaUnavailableReason> = {
  PENDING_FETCH: 'pendingFetch',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  FAILED: 'failed',
  QUARANTINED: 'quarantined',
  EXPIRED: 'expired',
};

// The only place that says whether a media may be rendered, and it answers no
// by default: READY, a known kind, and a resolved blob: URL. The media's own
// state is read before the source, because a file that is still processing
// has no business being fetched yet.
export const readHermesWaMediaAvailability = (
  media: HermesWaMedia,
  source: HermesWaMediaSource,
): HermesWaMediaAvailability => {
  if (media.state.kind === 'unknown') {
    return { kind: 'unavailable', reason: 'unknownState' };
  }

  if (media.state.state !== 'READY') {
    // The map covers the six non-READY states; the fallback exists so a state
    // added without a reason here fails closed rather than rendering.
    return {
      kind: 'unavailable',
      reason: UNAVAILABLE_BY_STATE[media.state.state] ?? 'unknownState',
    };
  }

  if (media.kind.kind === 'unknown') {
    return { kind: 'unavailable', reason: 'unknownKind' };
  }

  if (source.kind === 'absent') {
    return { kind: 'unavailable', reason: 'sourceAbsent' };
  }

  if (source.kind === 'resolving') {
    return { kind: 'unavailable', reason: 'sourceResolving' };
  }

  if (source.kind === 'expired') {
    return { kind: 'unavailable', reason: 'sourceExpired' };
  }

  const objectUrl = source.objectUrl.trim();

  // A resolved source carrying a blank URL is not a source.
  if (objectUrl.length === 0) {
    return { kind: 'unavailable', reason: 'sourceAbsent' };
  }

  return { kind: 'renderable', objectUrl };
};
