import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  type HermesWaRecordedClip,
  type HermesWaRecorderState,
  type HermesWaRecorderUnavailableReason,
} from '@/hermes-wa-ui/types/HermesWaRecorder';
import {
  readHermesWaRecorderRefusal,
  readHermesWaRecorderSupport,
} from '@/hermes-wa-ui/utils/readHermesWaRecorderRefusal';
import {
  HERMES_WA_RECORDER_INITIAL_STATE,
  reduceHermesWaRecorderState,
} from '@/hermes-wa-ui/utils/reduceHermesWaRecorderState';
import { stripHermesWaMimeParameters } from '@/hermes-wa-ui/utils/stripHermesWaMimeParameters';

// Fine enough for a seconds read-out, coarse enough not to re-render on every
// frame.
const TICK_INTERVAL_MS = 250;
// Bytes arrive on this cadence, so an abrupt stop still has most of the data.
const TIMESLICE_MS = 1000;

export type UseHermesWaVoiceRecorderOptions = {
  // A notification, not a send: this hook has no network path of any kind.
  onClipReady?: (clip: HermesWaRecordedClip) => void;
  // A ceiling in milliseconds. Reaching it stops the capture, exactly like
  // pressing Stop. It never sends.
  maxDurationMs?: number | null;
};

export type HermesWaVoiceRecorderController = {
  state: HermesWaRecorderState;
  // Why this browser could not record at all, read without opening anything.
  // Null when it could.
  unsupportedReason: HermesWaRecorderUnavailableReason | null;
  // MUST be called from a human click and from nowhere else. No effect in
  // this hook calls it, so the microphone never opens on mount, on a prop
  // change, or on a re-render.
  startRecording: () => void;
  // Ends the capture and moves to review. It does not send and does not
  // discard.
  stopRecording: () => void;
  // Ends any capture, releases the tracks, revokes the preview URL, returns
  // to idle. Also the way out of review.
  cancelRecording: () => void;
};

// The recorder's browser wiring. Every decision lives in the pure reducer;
// this hook owns only what cannot be pure — the MediaStream, the
// MediaRecorder, the tick interval and the blob: URL — and releases all four
// on cancel and on unmount, so leaving a conversation never leaves a
// microphone open.
export const useHermesWaVoiceRecorder = ({
  onClipReady,
  maxDurationMs = null,
}: UseHermesWaVoiceRecorderOptions = {}): HermesWaVoiceRecorderController => {
  const [state, dispatch] = useReducer(
    reduceHermesWaRecorderState,
    HERMES_WA_RECORDER_INITIAL_STATE,
  );

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  // Set before a stop that must not produce a clip. Without it, cancelling
  // would still hand the parent a recording the person threw away.
  const isDiscardingRef = useRef(false);
  // A getUserMedia promise can settle after unmount, leaving a live stream
  // nobody stops.
  const isMountedRef = useRef(true);

  const onClipReadyRef = useRef(onClipReady);

  useEffect(() => {
    onClipReadyRef.current = onClipReady;
  }, [onClipReady]);

  const support = useMemo(() => readHermesWaRecorderSupport(), []);

  const clearTicker = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
  }, []);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current !== null) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // One unwind path, shared by cancel and unmount so the two cannot drift.
  const teardown = useCallback(() => {
    isDiscardingRef.current = true;
    clearTicker();

    const recorder = recorderRef.current;

    if (recorder !== null && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Already stopped by the browser. The tracks still have to go.
      }
    }

    releaseStream();
    revokePreviewUrl();
  }, [clearTicker, releaseStream, revokePreviewUrl]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      teardown();
    },
    [teardown],
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder === null || recorder.state === 'inactive') {
      return;
    }

    clearTicker();
    dispatch({ type: 'stopRequested' });

    try {
      recorder.stop();
    } catch (error) {
      releaseStream();
      dispatch({
        type: 'captureFailed',
        reason: readHermesWaRecorderRefusal(error),
      });
    }
  }, [clearTicker, releaseStream]);

  const stopRecordingRef = useRef(stopRecording);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const cancelRecording = useCallback(() => {
    teardown();
    dispatch({ type: 'reset' });
  }, [teardown]);

  const startRecording = useCallback(() => {
    // A capability nobody confirmed is unavailable, and the refusal is
    // published as a state rather than as a dead button.
    if (support.kind === 'unsupported') {
      dispatch({ type: 'captureRefused', reason: support.reason });
      return;
    }

    // Dropped here, not when the new clip arrives: the preview element is
    // already unmounted, so revoking cannot pull a URL out from under it.
    revokePreviewUrl();
    isDiscardingRef.current = false;
    chunksRef.current = [];

    dispatch({ type: 'permissionRequested' });

    // The one call in this module that asks for a device, reached only from
    // here, and this function is only ever bound to a click.
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Unmounted or cancelled while the prompt was open: close the device
        // instead of recording into a screen that is gone.
        if (!isMountedRef.current || isDiscardingRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        let recorder: MediaRecorder;

        try {
          recorder = new MediaRecorder(stream);
        } catch (error) {
          releaseStream();
          dispatch({
            type: 'captureFailed',
            reason: readHermesWaRecorderRefusal(error),
          });
          return;
        }

        recorderRef.current = recorder;

        recorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        });

        recorder.addEventListener('error', () => {
          clearTicker();
          releaseStream();

          // MediaRecorderErrorEvent is not uniformly available, so the cause
          // is reported as unclassified rather than invented.
          if (isMountedRef.current) {
            dispatch({ type: 'captureFailed', reason: 'unknown' });
          }
        });

        recorder.addEventListener('stop', () => {
          clearTicker();

          const startedAt = startedAtRef.current;
          const chunks = chunksRef.current;
          const wasDiscarding = isDiscardingRef.current;

          releaseStream();

          if (wasDiscarding || !isMountedRef.current) {
            return;
          }

          const blob = new Blob(chunks, {
            type: recorder.mimeType !== '' ? recorder.mimeType : undefined,
          });

          // Nothing was captured. Reported as a failure rather than handed
          // over as an empty clip somebody might try to send.
          if (blob.size === 0) {
            dispatch({ type: 'captureFailed', reason: 'unknown' });
            return;
          }

          const previewUrl = URL.createObjectURL(blob);
          previewUrlRef.current = previewUrl;

          const clip: HermesWaRecordedClip = {
            blob,
            previewUrl,
            // Parameters stripped before the clip leaves: the contract
            // refuses a declared type that carries them.
            mimeType: stripHermesWaMimeParameters(
              recorder.mimeType !== '' ? recorder.mimeType : blob.type,
            ),
            durationMs: startedAt === null ? 0 : Date.now() - startedAt,
            byteSize: blob.size,
          };

          dispatch({ type: 'clipReady', clip });
          onClipReadyRef.current?.(clip);
        });

        try {
          recorder.start(TIMESLICE_MS);
        } catch (error) {
          releaseStream();
          dispatch({
            type: 'captureFailed',
            reason: readHermesWaRecorderRefusal(error),
          });
          return;
        }

        startedAtRef.current = Date.now();
        dispatch({ type: 'captureStarted' });

        intervalRef.current = setInterval(() => {
          const startedAt = startedAtRef.current;

          if (startedAt === null) {
            return;
          }

          const elapsedMs = Date.now() - startedAt;

          dispatch({ type: 'ticked', elapsedMs });

          // The ceiling stops the capture. Stopping is review, never a send.
          if (
            maxDurationMs !== null &&
            Number.isFinite(maxDurationMs) &&
            elapsedMs >= maxDurationMs
          ) {
            stopRecordingRef.current();
          }
        }, TICK_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current) {
          return;
        }

        dispatch({
          type: 'captureRefused',
          reason: readHermesWaRecorderRefusal(error),
        });
      });
  }, [clearTicker, maxDurationMs, releaseStream, revokePreviewUrl, support]);

  return {
    state,
    unsupportedReason: support.kind === 'unsupported' ? support.reason : null,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
