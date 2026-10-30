import {
  type HermesWaRecordedClip,
  type HermesWaRecorderState,
} from '@/hermes-wa-ui/types/HermesWaRecorder';
import {
  HERMES_WA_RECORDER_INITIAL_STATE,
  reduceHermesWaRecorderState,
} from '@/hermes-wa-ui/utils/reduceHermesWaRecorderState';

const clip: HermesWaRecordedClip = {
  blob: new Blob(['x'], { type: 'audio/webm' }),
  previewUrl: 'blob:preview',
  mimeType: 'audio/webm',
  durationMs: 4200,
  byteSize: 1,
};

const recording = (elapsedMs = 0): HermesWaRecorderState => ({
  kind: 'recording',
  elapsedMs,
});

describe('reduceHermesWaRecorderState', () => {
  it('starts idle: nothing is open before anyone presses anything', () => {
    expect(HERMES_WA_RECORDER_INITIAL_STATE).toEqual({ kind: 'idle' });
  });

  it('leaves idle only on an explicit permission request', () => {
    expect(
      reduceHermesWaRecorderState(
        { kind: 'idle' },
        { type: 'permissionRequested' },
      ),
    ).toEqual({ kind: 'requestingPermission' });
  });

  it('cannot be pushed past idle by any other event', () => {
    const idle: HermesWaRecorderState = { kind: 'idle' };

    expect(
      reduceHermesWaRecorderState(idle, { type: 'captureStarted' }),
    ).toEqual(idle);
    expect(
      reduceHermesWaRecorderState(idle, { type: 'ticked', elapsedMs: 1000 }),
    ).toEqual(idle);
    expect(
      reduceHermesWaRecorderState(idle, { type: 'stopRequested' }),
    ).toEqual(idle);
    // A clip from an attempt that was cancelled cannot reopen the recorder.
    expect(
      reduceHermesWaRecorderState(idle, { type: 'clipReady', clip }),
    ).toEqual(idle);
  });

  it('opens capture only after the request, and reports a refusal as unavailable', () => {
    const requesting = reduceHermesWaRecorderState(
      { kind: 'idle' },
      { type: 'permissionRequested' },
    );

    expect(
      reduceHermesWaRecorderState(requesting, { type: 'captureStarted' }),
    ).toEqual({ kind: 'recording', elapsedMs: 0 });

    expect(
      reduceHermesWaRecorderState(requesting, {
        type: 'captureRefused',
        reason: 'permissionDenied',
      }),
    ).toEqual({ kind: 'unavailable', reason: 'permissionDenied' });

    expect(
      reduceHermesWaRecorderState(requesting, {
        type: 'captureRefused',
        reason: 'noMicrophone',
      }),
    ).toEqual({ kind: 'unavailable', reason: 'noMicrophone' });
  });

  it('keeps each refusal reason distinct rather than folding them together', () => {
    const requesting: HermesWaRecorderState = { kind: 'requestingPermission' };

    const reasons = [
      'notSupported',
      'insecureContext',
      'permissionDenied',
      'noMicrophone',
      'microphoneBusy',
      'unknown',
    ] as const;

    reasons.forEach((reason) => {
      expect(
        reduceHermesWaRecorderState(requesting, {
          type: 'captureRefused',
          reason,
        }),
      ).toEqual({ kind: 'unavailable', reason });
    });
  });

  it('advances the elapsed time while recording', () => {
    expect(
      reduceHermesWaRecorderState(recording(0), {
        type: 'ticked',
        elapsedMs: 4250,
      }),
    ).toEqual({ kind: 'recording', elapsedMs: 4250 });
  });

  it('stops into review and never into anything that resembles a send', () => {
    const stopping = reduceHermesWaRecorderState(recording(4250), {
      type: 'stopRequested',
    });

    expect(stopping).toEqual({ kind: 'stopping', elapsedMs: 4250 });

    const review = reduceHermesWaRecorderState(stopping, {
      type: 'clipReady',
      clip,
    });

    expect(review).toEqual({ kind: 'review', clip });
  });

  it('ignores ticks after the stop, so the announced duration stops climbing', () => {
    const stopping: HermesWaRecorderState = {
      kind: 'stopping',
      elapsedMs: 4250,
    };

    expect(
      reduceHermesWaRecorderState(stopping, { type: 'ticked', elapsedMs: 9000 }),
    ).toEqual(stopping);
  });

  it('takes a clip that ends on its own, without a stop having been asked for', () => {
    expect(
      reduceHermesWaRecorderState(recording(1000), { type: 'clipReady', clip }),
    ).toEqual({ kind: 'review', clip });
  });

  it('has no transition out of review other than a new attempt or a reset', () => {
    const review: HermesWaRecorderState = { kind: 'review', clip };

    expect(
      reduceHermesWaRecorderState(review, { type: 'ticked', elapsedMs: 10 }),
    ).toEqual(review);
    expect(
      reduceHermesWaRecorderState(review, { type: 'stopRequested' }),
    ).toEqual(review);
    expect(
      reduceHermesWaRecorderState(review, { type: 'captureStarted' }),
    ).toEqual(review);

    expect(
      reduceHermesWaRecorderState(review, { type: 'permissionRequested' }),
    ).toEqual({ kind: 'requestingPermission' });
    expect(reduceHermesWaRecorderState(review, { type: 'reset' })).toEqual({
      kind: 'idle',
    });
  });

  it('separates a device that never opened from a capture that broke', () => {
    expect(
      reduceHermesWaRecorderState(
        { kind: 'requestingPermission' },
        { type: 'captureFailed', reason: 'microphoneBusy' },
      ),
    ).toEqual({ kind: 'unavailable', reason: 'microphoneBusy' });

    expect(
      reduceHermesWaRecorderState(recording(2000), {
        type: 'captureFailed',
        reason: 'unknown',
      }),
    ).toEqual({ kind: 'failed', reason: 'unknown' });
  });

  it('lets a person ask again after a refusal or a failure', () => {
    expect(
      reduceHermesWaRecorderState(
        { kind: 'unavailable', reason: 'permissionDenied' },
        { type: 'permissionRequested' },
      ),
    ).toEqual({ kind: 'requestingPermission' });

    expect(
      reduceHermesWaRecorderState(
        { kind: 'failed', reason: 'unknown' },
        { type: 'permissionRequested' },
      ),
    ).toEqual({ kind: 'requestingPermission' });
  });

  it('accepts a reset from every state', () => {
    const states: HermesWaRecorderState[] = [
      { kind: 'idle' },
      { kind: 'requestingPermission' },
      { kind: 'unavailable', reason: 'noMicrophone' },
      recording(500),
      { kind: 'stopping', elapsedMs: 500 },
      { kind: 'review', clip },
      { kind: 'failed', reason: 'unknown' },
    ];

    states.forEach((state) => {
      expect(reduceHermesWaRecorderState(state, { type: 'reset' })).toEqual({
        kind: 'idle',
      });
    });
  });
});
