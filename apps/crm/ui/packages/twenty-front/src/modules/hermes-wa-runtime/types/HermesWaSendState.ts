import { type MessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

import { type HermesWaRuntimeMessage } from '@/hermes-wa-runtime/types/HermesWaRuntimeMessage';

// One human reply attempt, from the draft to whatever the server said.
//
// `clientRequestId` appears from `requested` onward and never changes within an
// attempt: the contract states that the original durable request id returns the
// original result and never re-emits a provider POST, so minting a second id
// for the same content is the one thing that could send a customer two
// messages. It is therefore minted once, in one place, and carried through.
//
// `unconfirmed` is the state after a timeout or an answer this client could not
// read. It is NOT a failure and it is NOT a send: the request did leave, and
// what the server made of it is unknown. Nothing retries it on its own.
export type HermesWaSendState =
  | { kind: 'draft' }
  | { kind: 'requested'; clientRequestId: string }
  | {
      kind: 'accepted';
      clientRequestId: string;
      message: HermesWaRuntimeMessage;
    }
  | { kind: 'unconfirmed'; clientRequestId: string }
  | {
      kind: 'failed';
      clientRequestId: string;
      failure: MessagingInboxCallFailure;
    };

// The three asset kinds a WhatsApp reply may carry. FILE is deliberately out:
// the contract states WhatsApp prepare and reply do not accept it.
export const HERMES_WA_SENDABLE_ASSET_KINDS = [
  'IMAGE',
  'VIDEO',
  'AUDIO',
] as const;

export type HermesWaSendableAssetKind =
  (typeof HERMES_WA_SENDABLE_ASSET_KINDS)[number];

// The server's own word for a finalized asset's kind, reduced to the three a
// reply may carry. Anything else — FILE, an unknown value, an absent field —
// is null, which is "the server named no sendable kind" and never a guess.
export const readHermesWaSendableAssetKind = (
  rawKind: string | null,
): HermesWaSendableAssetKind | null => {
  if (rawKind === null) {
    return null;
  }

  const normalised = rawKind.trim().toUpperCase();

  return (HERMES_WA_SENDABLE_ASSET_KINDS as readonly string[]).includes(
    normalised,
  )
    ? (normalised as HermesWaSendableAssetKind)
    : null;
};

// One media attachment's journey, from the file a person chose to the asset id
// a reply may carry.
//
// `ready` holds the only asset id a send may reference. An attempt that ended
// anywhere else has no asset, so no send can quietly reuse one.
export type HermesWaUploadState =
  | { kind: 'idle' }
  // Prepare is on the wire. No bytes have left yet.
  | { kind: 'preparing' }
  // The bytes are being PUT to the native quarantine target.
  | { kind: 'uploading'; assetId: string }
  | { kind: 'finalizing'; assetId: string }
  // `assetKind` is the kind the SERVER validated at finalize. It is the
  // authority for the reply kind: an Opus recording the native sniff called
  // `video/webm` is AUDIO on the server, and choosing from the MIME would send
  // it as a video the server then refuses. Null is the server naming no
  // sendable kind, and only then is the MIME a last resort.
  | {
      kind: 'ready';
      assetId: string;
      mimeType: string;
      assetKind: HermesWaSendableAssetKind | null;
    }
  | { kind: 'cancelling'; assetId: string }
  | { kind: 'cancelled' }
  | {
      kind: 'failed';
      // Kept when there is one, so the operator can cancel the asset the
      // server did create before the step that broke.
      assetId: string | null;
      failure: MessagingInboxCallFailure;
    }
  // The server refused. An authorisation answer, shown as a refusal.
  | { kind: 'denied'; message: string | null }
  // The file was refused before anything left the browser, by the library's
  // own pure verdict. No request was made.
  | { kind: 'refusedLocally'; reason: string };
