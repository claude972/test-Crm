import { type HermesWaRecorderUnavailableReason } from '@/hermes-wa-ui/types/HermesWaRecorder';

// What a browser's refusal of getUserMedia actually says. Anything
// unrecognised becomes `unknown`, never `permissionDenied`: guessing at a
// denial accuses the person of a refusal they did not make, and sends them to
// the wrong settings screen.
export const readHermesWaRecorderRefusal = (
  error: unknown,
): HermesWaRecorderUnavailableReason => {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? (error as { name: unknown }).name
      : null;

  if (typeof name !== 'string') {
    return 'unknown';
  }

  switch (name) {
    // SecurityError is the older spelling some engines throw for a block.
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permissionDenied';

    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'noMicrophone';

    // A device exists and could not be opened: held elsewhere, or a hardware
    // error.
    case 'NotReadableError':
    case 'AbortError':
      return 'microphoneBusy';

    default:
      return 'unknown';
  }
};

// Whether this browser can record at all, read without touching the device:
// no prompt, no stream, safe at render time. The Record button needs it, so
// it can say up front that recording is impossible. An insecure origin is
// reported separately, because "unsupported browser" would be wrong advice.
export const readHermesWaRecorderSupport = ():
  | { kind: 'supported' }
  | { kind: 'unsupported'; reason: HermesWaRecorderUnavailableReason } => {
  if (typeof window === 'undefined') {
    return { kind: 'unsupported', reason: 'notSupported' };
  }

  // A browser without isSecureContext is not declared insecure on that basis.
  if (window.isSecureContext === false) {
    return { kind: 'unsupported', reason: 'insecureContext' };
  }

  if (typeof window.MediaRecorder === 'undefined') {
    return { kind: 'unsupported', reason: 'notSupported' };
  }

  if (
    typeof navigator === 'undefined' ||
    typeof navigator.mediaDevices?.getUserMedia !== 'function'
  ) {
    return { kind: 'unsupported', reason: 'notSupported' };
  }

  return { kind: 'supported' };
};
