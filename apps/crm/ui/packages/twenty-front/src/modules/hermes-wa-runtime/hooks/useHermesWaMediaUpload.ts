import { useMutation } from '@apollo/client/react';
import { useCallback, useRef, useState } from 'react';

import { readMessagingInboxCallFailure } from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

import { HERMES_WA_DOCUMENTED_MEDIA_LIMITS } from '@/hermes-wa-ui/constants/HermesWaMediaLimits';
import { judgeHermesWaMediaSelection } from '@/hermes-wa-ui/utils/judgeHermesWaMediaSelection';
import { readHermesWaMimeKind } from '@/hermes-wa-ui/utils/readHermesWaMimeKind';
import { stripHermesWaMimeParameters } from '@/hermes-wa-ui/utils/stripHermesWaMimeParameters';

import {
  HERMES_WA_CANCEL_MEDIA_UPLOAD,
  HERMES_WA_FINALIZE_MEDIA_UPLOAD,
  HERMES_WA_PREPARE_MEDIA_UPLOAD,
} from '@/hermes-wa-runtime/graphql/metadata-mutations/hermesWaMediaUpload';
import {
  type HermesWaUploadState,
  readHermesWaSendableAssetKind,
} from '@/hermes-wa-runtime/types/HermesWaSendState';
import {
  readHermesWaFinalizedAsset,
  readHermesWaUploadTarget,
} from '@/hermes-wa-runtime/utils/readHermesWaRuntimePayload';

// The three kinds WhatsApp prepare accepts. FILE is deliberately absent: the
// contract states WhatsApp prepare and reply do not accept it, and it belongs
// to the shared email asset service.
type HermesWaUploadKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

type HermesWaPrepareInput = {
  conversationId: string;
  kind: HermesWaUploadKind;
  filename: string;
  mimeType: string;
  size: number;
};

type HermesWaScopeInput = { conversationId: string; assetId: string };

export type HermesWaMediaUpload = {
  state: HermesWaUploadState;
  // Runs prepare, then the raw-byte PUT, then finalize. Nothing starts without
  // this being called from a human action. True means this attempt acquired
  // the lock; it does not mean the asset is ready or the provider sent it.
  upload: (conversationId: string, file: Blob, filename: string) => boolean;
  // Durably revokes a draft asset. Offered only for an asset that exists and
  // has not been sent: the contract allows cancelling PENDING and READY alone.
  cancel: (() => void) | null;
  reset: () => void;
};

// The library's renderer kinds are IMAGE / VIDEO / VOICE / FILE; prepare wants
// IMAGE / VIDEO / AUDIO. VOICE is the same thing as AUDIO under another name,
// so it is translated. FILE and an unknown kind are refused: neither is a kind
// WhatsApp prepare accepts, and sending one anyway would be this client
// guessing a category the server would reject.
const readUploadKind = (mimeType: string): HermesWaUploadKind | null => {
  const read = readHermesWaMimeKind(mimeType);

  if (read.kind !== 'known') {
    return null;
  }

  if (read.mediaKind === 'IMAGE') {
    return 'IMAGE';
  }

  if (read.mediaKind === 'VIDEO') {
    return 'VIDEO';
  }

  if (read.mediaKind === 'VOICE') {
    return 'AUDIO';
  }

  return null;
};

// One media attachment, from the file a person chose to the asset id a reply
// may carry.
//
// Nothing here runs on mount. There is no effect in this file: the only entry
// points are `upload`, `cancel` and `reset`, and each is wired to a control.
//
// The scope is captured before any await. `conversationId` is read into a local
// const at the top of `upload`, frozen into the prepare input, and the SAME
// captured value is what the PUT, the finalize and the cancel use. The
// conversation the operator is looking at may have changed three times by the
// time finalize runs; this asset still belongs to the thread it was prepared
// for, and re-reading a live state here would bind it to the wrong one.
//
// No secret is logged. The upload URL and the download path are short-lived
// credentials in all but name, and neither reaches a console.
export const useHermesWaMediaUpload = (): HermesWaMediaUpload => {
  // skipRetry on all three: a transport replay of prepare would strand an
  // orphan asset, and a replay of finalize or cancel would act twice on a
  // lifecycle the server reserves atomically.
  const [prepareMutation] = useMutation<
    { hermesPrepareMediaUpload: unknown },
    { input: HermesWaPrepareInput }
  >(HERMES_WA_PREPARE_MEDIA_UPLOAD, { context: { skipRetry: true } });

  const [finalizeMutation] = useMutation<
    { hermesFinalizeMediaUpload: unknown },
    { input: HermesWaScopeInput }
  >(HERMES_WA_FINALIZE_MEDIA_UPLOAD, { context: { skipRetry: true } });

  const [cancelMutation] = useMutation<
    { hermesCancelMediaUpload: unknown },
    { input: HermesWaScopeInput }
  >(HERMES_WA_CANCEL_MEDIA_UPLOAD, { context: { skipRetry: true } });

  const [state, setState] = useState<HermesWaUploadState>({ kind: 'idle' });

  // The scope this asset was prepared for, captured once. Held so cancel acts
  // on the thread the asset belongs to and not on the one now on screen.
  const [scope, setScope] = useState<HermesWaScopeInput | null>(null);

  // One attempt owns this hook at a time.
  //
  // The lock stops a second upload starting while one is in flight. The
  // generation is what makes that safe rather than merely tidy: reset and
  // cancel both release the lock, so a superseded run's promises can still
  // land afterwards. Every write below is stamped with the generation that
  // issued it, and a stale stamp is dropped.
  //
  // Without this, a voice note and a file in flight together can resolve
  // inverted and leave the preview of one beside the asset id of the other —
  // which sends the wrong bytes to a customer under a preview the operator
  // trusted.
  const generationRef = useRef(0);
  const isRunningRef = useRef(false);

  const upload = useCallback(
    (conversationId: string, file: Blob, filename: string) => {
      // The lock. The in-flight attempt keeps its own state, so the operator
      // goes on seeing its real progress rather than a reset one.
      if (isRunningRef.current) {
        return false;
      }

      // Everything the request needs is read out here, synchronously, before
      // the first await.
      const capturedConversationId = conversationId;
      const byteSize = file.size;

      // Parameters off before prepare: MediaRecorder reports
      // `audio/webm;codecs=opus`, and the contract refuses a declared type
      // carrying parameters. Only the parameters go — the type itself is never
      // rewritten into one the server is thought to prefer.
      const mimeType = stripHermesWaMimeParameters(file.type);

      const verdict = judgeHermesWaMediaSelection(
        { name: filename, byteSize, mimeType },
        HERMES_WA_DOCUMENTED_MEDIA_LIMITS,
      );

      // Refused before anything leaves the browser. The server stays the
      // authority and can still refuse a file this accepted; what this cannot
      // do is let a file through that the published contract already rules out.
      if (verdict.kind === 'refused') {
        setState({ kind: 'refusedLocally', reason: verdict.reason });

        return false;
      }

      // An undecidable verdict means a limit is unknown here, NOT that there
      // is none. Unknown keeps the send closed.
      if (verdict.kind === 'undecidable') {
        setState({ kind: 'refusedLocally', reason: verdict.reason });

        return false;
      }

      const kind = readUploadKind(mimeType);

      if (kind === null) {
        setState({ kind: 'refusedLocally', reason: 'unacceptedType' });

        return false;
      }

      // This attempt's stamp. Taken before the first await, like every other
      // captured value.
      const generation = generationRef.current + 1;

      generationRef.current = generation;
      isRunningRef.current = true;

      const isCurrent = () => generationRef.current === generation;

      const run = async () => {
        // Every write this attempt makes goes through here, so a superseded
        // attempt cannot repaint the screen with its own outcome.
        const commit = (next: HermesWaUploadState) => {
          if (isCurrent()) {
            setState(next);
          }
        };

        commit({ kind: 'preparing' });

        if (isCurrent()) {
          setScope(null);
        }

        let preparedAssetId: string | null = null;

        try {
          const prepared = await prepareMutation({
            variables: {
              input: {
                conversationId: capturedConversationId,
                kind,
                filename,
                mimeType,
                size: byteSize,
              },
            },
          });

          // Superseded while prepare was in flight. The bytes are NOT pushed:
          // this attempt no longer owns the hook.
          if (!isCurrent()) {
            return;
          }

          const target = readHermesWaUploadTarget(
            prepared.data?.hermesPrepareMediaUpload,
          );

          if (target.kind === 'unreadable') {
            commit({
              kind: 'failed',
              assetId: null,
              failure: { kind: 'failed', message: null },
            });

            return;
          }

          preparedAssetId = target.value.assetId;
          setScope({
            conversationId: capturedConversationId,
            assetId: target.value.assetId,
          });
          commit({ kind: 'uploading', assetId: target.value.assetId });

          // The raw bytes, to the native quarantine target the server named,
          // with EXACTLY the content type it named. No multipart, no base64,
          // no type of this client's choosing: the native sniff must agree
          // with the declared MIME, and a type invented here would make it
          // disagree.
          const response = await fetch(target.value.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': target.value.contentType },
            body: file,
            // The target is a backend route bound to this session, so the
            // session travels with it.
            credentials: 'include',
          });

          if (!isCurrent()) {
            return;
          }

          if (!response.ok) {
            commit({
              kind: 'failed',
              assetId: target.value.assetId,
              failure: { kind: 'failed', message: null },
            });

            return;
          }

          commit({ kind: 'finalizing', assetId: target.value.assetId });

          const finalized = await finalizeMutation({
            variables: {
              input: {
                conversationId: capturedConversationId,
                assetId: target.value.assetId,
              },
            },
          });

          if (!isCurrent()) {
            return;
          }

          const asset = readHermesWaFinalizedAsset(
            finalized.data?.hermesFinalizeMediaUpload,
          );

          if (asset.kind === 'unreadable') {
            commit({
              kind: 'failed',
              assetId: target.value.assetId,
              failure: { kind: 'failed', message: null },
            });

            return;
          }

          // READY is the server's decision and is read from its answer, never
          // assumed from the fact that finalize returned. A finalize that came
          // back with another status has not produced a sendable asset.
          if (asset.value.rawStatus?.toUpperCase() !== 'READY') {
            commit({
              kind: 'failed',
              assetId: asset.value.id,
              failure: { kind: 'failed', message: null },
            });

            return;
          }

          commit({
            kind: 'ready',
            assetId: asset.value.id,
            // The authoritative MIME is the one finalize returned. If the
            // native sniff reported video/webm for audio/webm input, that is
            // the type that stands, and this client does not argue with it.
            mimeType: asset.value.mimeType ?? mimeType,
            // And the kind the server VALIDATED, which is what a reply must
            // travel as. For that same video/webm recording the server says
            // AUDIO, and the MIME would have said video.
            assetKind: readHermesWaSendableAssetKind(asset.value.rawKind),
          });
        } catch (error) {
          const failure = readMessagingInboxCallFailure(error);

          commit(
            failure.kind === 'denied'
              ? { kind: 'denied', message: failure.message }
              : // The asset id is kept when there is one, so the operator can
                // cancel the draft the server did create before the step that
                // broke. Nothing cancels it automatically: a cancel is a
                // durable revocation and belongs to a person.
                { kind: 'failed', assetId: preparedAssetId, failure },
          );
        } finally {
          // Only this attempt's own lock is released. A newer attempt that
          // superseded it owns the lock now and must keep it.
          if (isCurrent()) {
            isRunningRef.current = false;
          }
        }
      };

      void run();

      return true;
    },
    [finalizeMutation, prepareMutation],
  );

  const cancelAsset = useCallback(
    (input: HermesWaScopeInput) => {
      // Captured before the await, like every other step.
      const captured = input;

      // A cancel supersedes whatever upload attempt was current, so a late
      // promise from it cannot overwrite the cancellation, and it takes the
      // lock for itself rather than leaving it held.
      const generation = generationRef.current + 1;

      generationRef.current = generation;
      isRunningRef.current = true;

      const isCurrent = () => generationRef.current === generation;

      const commit = (next: HermesWaUploadState) => {
        if (isCurrent()) {
          setState(next);
        }
      };

      const run = async () => {
        commit({ kind: 'cancelling', assetId: captured.assetId });

        try {
          await cancelMutation({ variables: { input: captured } });
          commit({ kind: 'cancelled' });

          if (isCurrent()) {
            setScope(null);
          }
        } catch (error) {
          const failure = readMessagingInboxCallFailure(error);

          commit(
            failure.kind === 'denied'
              ? { kind: 'denied', message: failure.message }
              : { kind: 'failed', assetId: captured.assetId, failure },
          );
        } finally {
          if (isCurrent()) {
            isRunningRef.current = false;
          }
        }
      };

      void run();
    },
    [cancelMutation],
  );

  const reset = useCallback(() => {
    // Supersedes any attempt in flight and frees the lock, so the next upload
    // can start and the superseded one can no longer write.
    generationRef.current += 1;
    isRunningRef.current = false;
    setState({ kind: 'idle' });
    setScope(null);
  }, []);

  // Cancelling needs an asset that exists and has not been sent. 'ready' and
  // 'failed' are the two states where one may: the contract allows cancelling
  // PENDING and READY, and a sent asset cannot be cancelled as a draft.
  const canCancel =
    scope !== null && (state.kind === 'ready' || state.kind === 'failed');

  return {
    state,
    upload,
    cancel: canCancel && scope !== null ? () => cancelAsset(scope) : null,
    reset,
  };
};
