import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import {
  type HermesWaMediaKindRead,
  readHermesWaMediaKind,
} from '@/hermes-wa-ui/types/HermesWaMediaKind';
import {
  type HermesWaMediaStateRead,
  readHermesWaMediaState,
} from '@/hermes-wa-ui/types/HermesWaMediaState';

import { type HermesWaRuntimeAsset } from '@/hermes-wa-runtime/types/HermesWaRuntimeAsset';

// The wire's asset kinds are IMAGE, VIDEO, AUDIO and FILE. The library's
// renderer kinds are IMAGE, VIDEO, VOICE and FILE. Only AUDIO differs, and it
// is translated here rather than passed through: `readHermesWaMediaKind`
// correctly refuses AUDIO, and an unknown kind picks no renderer at all.
//
// Nothing else is translated. A kind outside the four keeps the server's own
// word and stays unknown.
const readAssetKind = (rawKind: string | null): HermesWaMediaKindRead => {
  if (rawKind === null) {
    return readHermesWaMediaKind(null);
  }

  const normalised = rawKind.trim().toUpperCase();

  return readHermesWaMediaKind(normalised === 'AUDIO' ? 'VOICE' : normalised);
};

// The wire's asset statuses are PENDING, READY, ATTACHED and REVOKED. The
// library's lifecycle is a different, longer list, and only READY may be
// rendered.
//
// Two translations, and no more:
//   PENDING  -> UPLOADING, which is what PENDING means on this side: the
//               quarantine target exists and the bytes are not in yet.
//   ATTACHED -> READY, because an attached asset is a sent or received one and
//               is exactly what a thread renders.
//
// REVOKED is deliberately NOT mapped. The library's QUARANTINED is a content
// decision and its EXPIRED is a lapsed access; a revocation is neither, so
// forcing it into one of them would put the wrong sentence on screen. It falls
// through, stays unknown, keeps the server's own word, and fails closed — which
// is what an unmapped status should do.
const readAssetState = (rawStatus: string | null): HermesWaMediaStateRead => {
  if (rawStatus === null) {
    return readHermesWaMediaState(null);
  }

  const normalised = rawStatus.trim().toUpperCase();

  if (normalised === 'PENDING') {
    return readHermesWaMediaState('UPLOADING');
  }

  if (normalised === 'ATTACHED') {
    return readHermesWaMediaState('READY');
  }

  return readHermesWaMediaState(normalised);
};

// One wire asset as the library's descriptor.
//
// The descriptor carries no address of any kind, by design: the contract's read
// returns a relative path needing the session, so an address here would only
// invite a `src` that cannot work. The bytes travel separately, as a
// HermesWaMediaSource this module resolved.
//
// `alt` and `durationMs` stay null. The contract publishes neither a sender
// description nor a duration for a WhatsApp asset, and a fabricated alt text
// would be this client speaking in the sender's voice.
export const toHermesWaMedia = (asset: HermesWaRuntimeAsset): HermesWaMedia => ({
  id: asset.id,
  kind: readAssetKind(asset.rawKind),
  state: readAssetState(asset.rawStatus),
  name: asset.filename,
  byteSize: asset.byteSize,
  mimeType: asset.mimeType,
  alt: null,
  durationMs: null,
  errorCode: null,
});
