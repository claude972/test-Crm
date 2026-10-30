// Why recording is not possible. Each reason is a distinct state with its own
// sentence: telling someone their permission was denied when no microphone is
// plugged in sends them to the wrong settings screen.
export const HERMES_WA_RECORDER_UNAVAILABLE_REASONS = [
  'notSupported',
  'insecureContext',
  'permissionDenied',
  'noMicrophone',
  'microphoneBusy',
  'unknown',
] as const;

export type HermesWaRecorderUnavailableReason =
  (typeof HERMES_WA_RECORDER_UNAVAILABLE_REASONS)[number];

// A recording that exists in this browser and nowhere else. Whoever holds the
// clip owns revoking `previewUrl`.
export type HermesWaRecordedClip = {
  blob: Blob;
  previewUrl: string;
  // type/subtype only: MediaRecorder reports `audio/webm;codecs=opus` and the
  // contract refuses a declared type carrying parameters. Empty when the
  // browser reported none, which is said rather than filled in.
  mimeType: string;
  // Elapsed wall time from the recorder's ticks, not a decoded duration.
  durationMs: number;
  byteSize: number;
};

// The recorder's states. Nothing leaves `idle` but an explicit permission
// request, so no mount or re-render can open a microphone. `clipReady` lands
// on `review` and stops there: handing the clip over is the parent's
// callback, not a transition.
export type HermesWaRecorderState =
  | { kind: 'idle' }
  // A prompt may be open; no bytes are being captured yet.
  | { kind: 'requestingPermission' }
  | { kind: 'unavailable'; reason: HermesWaRecorderUnavailableReason }
  | { kind: 'recording'; elapsedMs: number }
  | { kind: 'stopping'; elapsedMs: number }
  // A clip is in hand, locally. Nothing has been sent.
  | { kind: 'review'; clip: HermesWaRecordedClip }
  // Capture started and then broke. Distinct from `unavailable`: the device
  // was reachable, so retrying is reasonable.
  | { kind: 'failed'; reason: HermesWaRecorderUnavailableReason };

export type HermesWaRecorderEvent =
  // Dispatched from the click handler, before anything is asked of the
  // browser.
  | { type: 'permissionRequested' }
  | { type: 'captureStarted' }
  | { type: 'captureRefused'; reason: HermesWaRecorderUnavailableReason }
  | { type: 'ticked'; elapsedMs: number }
  | { type: 'stopRequested' }
  | { type: 'clipReady'; clip: HermesWaRecordedClip }
  | { type: 'captureFailed'; reason: HermesWaRecorderUnavailableReason }
  // Cancel, or "record another one".
  | { type: 'reset' };
