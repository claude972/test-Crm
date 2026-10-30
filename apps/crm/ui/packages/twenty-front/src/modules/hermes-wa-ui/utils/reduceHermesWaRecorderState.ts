import {
  type HermesWaRecorderEvent,
  type HermesWaRecorderState,
} from '@/hermes-wa-ui/types/HermesWaRecorder';

export const HERMES_WA_RECORDER_INITIAL_STATE: HermesWaRecorderState = {
  kind: 'idle',
};

// The recorder's only transition table, pure so both rules are testable
// without a browser: nothing leaves `idle` but `permissionRequested`, and
// `clipReady` lands on `review` and stops there. An event that does not apply
// returns the same state, so a stale callback is a no-op rather than a jump.
export const reduceHermesWaRecorderState = (
  state: HermesWaRecorderState,
  event: HermesWaRecorderEvent,
): HermesWaRecorderState => {
  // Accepted from every state: how a person gets out, and how the hook
  // unwinds a half-started attempt.
  if (event.type === 'reset') {
    return { kind: 'idle' };
  }

  switch (state.kind) {
    case 'idle':
    case 'unavailable':
    case 'failed': {
      // Asking again is allowed: the permission can be granted in the
      // browser's own UI between two presses.
      if (event.type === 'permissionRequested') {
        return { kind: 'requestingPermission' };
      }

      return state;
    }

    case 'requestingPermission': {
      if (event.type === 'captureStarted') {
        return { kind: 'recording', elapsedMs: 0 };
      }

      if (event.type === 'captureRefused') {
        return { kind: 'unavailable', reason: event.reason };
      }

      // A failure during the request is still a failure to open the device.
      if (event.type === 'captureFailed') {
        return { kind: 'unavailable', reason: event.reason };
      }

      return state;
    }

    case 'recording': {
      if (event.type === 'ticked') {
        return { kind: 'recording', elapsedMs: event.elapsedMs };
      }

      if (event.type === 'stopRequested') {
        return { kind: 'stopping', elapsedMs: state.elapsedMs };
      }

      if (event.type === 'captureFailed') {
        return { kind: 'failed', reason: event.reason };
      }

      // The browser can end a recording on its own when the track dies.
      if (event.type === 'clipReady') {
        return { kind: 'review', clip: event.clip };
      }

      return state;
    }

    case 'stopping': {
      if (event.type === 'clipReady') {
        return { kind: 'review', clip: event.clip };
      }

      if (event.type === 'captureFailed') {
        return { kind: 'failed', reason: event.reason };
      }

      // Ticks after the stop are ignored: the announced duration must not
      // keep climbing once capture has ended.
      return state;
    }

    case 'review': {
      // A new attempt goes through the permission request like the first.
      // Nothing here forwards the clip: that is the parent's callback.
      if (event.type === 'permissionRequested') {
        return { kind: 'requestingPermission' };
      }

      return state;
    }
  }
};
