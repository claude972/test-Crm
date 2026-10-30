import {
  readHermesWaRecorderRefusal,
  readHermesWaRecorderSupport,
} from '@/hermes-wa-ui/utils/readHermesWaRecorderRefusal';

describe('readHermesWaRecorderRefusal', () => {
  it('reads a denial as a denial', () => {
    expect(readHermesWaRecorderRefusal({ name: 'NotAllowedError' })).toBe(
      'permissionDenied',
    );
    expect(readHermesWaRecorderRefusal({ name: 'SecurityError' })).toBe(
      'permissionDenied',
    );
  });

  it('separates a missing device from a refused permission', () => {
    expect(readHermesWaRecorderRefusal({ name: 'NotFoundError' })).toBe(
      'noMicrophone',
    );
    expect(readHermesWaRecorderRefusal({ name: 'OverconstrainedError' })).toBe(
      'noMicrophone',
    );
  });

  it('separates a device it could not open from both', () => {
    expect(readHermesWaRecorderRefusal({ name: 'NotReadableError' })).toBe(
      'microphoneBusy',
    );
    expect(readHermesWaRecorderRefusal({ name: 'AbortError' })).toBe(
      'microphoneBusy',
    );
  });

  it('never accuses anyone of a refusal it cannot see', () => {
    expect(readHermesWaRecorderRefusal({ name: 'SomethingElseError' })).toBe(
      'unknown',
    );
    expect(readHermesWaRecorderRefusal(new Error('boom'))).toBe('unknown');
    expect(readHermesWaRecorderRefusal(null)).toBe('unknown');
    expect(readHermesWaRecorderRefusal(undefined)).toBe('unknown');
    expect(readHermesWaRecorderRefusal('NotAllowedError')).toBe('unknown');
    expect(readHermesWaRecorderRefusal({ name: 42 })).toBe('unknown');
  });
});

describe('readHermesWaRecorderSupport', () => {
  const originalMediaRecorder = window.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;

  const setMediaDevices = (value: unknown) => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value,
    });
  };

  afterEach(() => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: originalMediaRecorder,
    });
    setMediaDevices(originalMediaDevices);
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
  });

  it('reports support only when both APIs are there', () => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: function MediaRecorderStub() {},
    });
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) });

    expect(readHermesWaRecorderSupport()).toEqual({ kind: 'supported' });
  });

  it('calls an absent MediaRecorder unsupported rather than assuming it works', () => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: undefined,
    });
    setMediaDevices({ getUserMedia: () => Promise.resolve({}) });

    expect(readHermesWaRecorderSupport()).toEqual({
      kind: 'unsupported',
      reason: 'notSupported',
    });
  });

  it('calls an absent getUserMedia unsupported', () => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: function MediaRecorderStub() {},
    });
    setMediaDevices(undefined);

    expect(readHermesWaRecorderSupport()).toEqual({
      kind: 'unsupported',
      reason: 'notSupported',
    });
  });

  it('names an insecure origin instead of blaming the browser', () => {
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });

    expect(readHermesWaRecorderSupport()).toEqual({
      kind: 'unsupported',
      reason: 'insecureContext',
    });
  });
});
