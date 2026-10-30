import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { HermesWaVoiceRecorder } from '@/hermes-wa-ui/components/HermesWaVoiceRecorder';
import { type HermesWaCapability } from '@/hermes-wa-ui/types/HermesWaCapability';
import { type HermesWaRecordedClip } from '@/hermes-wa-ui/types/HermesWaRecorder';

const OPEN: HermesWaCapability = { kind: 'available' };

// A MediaRecorder that behaves like the real one on the two points this
// component depends on: it only produces data once something started it, and
// stopping emits `dataavailable` then `stop`.
class MediaRecorderStub extends EventTarget {
  static instances: MediaRecorderStub[] = [];

  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType = 'audio/webm;codecs=opus';

  constructor() {
    super();
    MediaRecorderStub.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';

    const dataEvent = new Event('dataavailable');
    Object.assign(dataEvent, {
      data: new Blob(['recorded-bytes'], { type: 'audio/webm' }),
    });

    this.dispatchEvent(dataEvent);
    this.dispatchEvent(new Event('stop'));
  }
}

const trackStop = jest.fn();
const getUserMedia = jest.fn();

const renderRecorder = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

// jsdom has no object URL support. The stubs stay in place for the whole file:
// restoring them per test would break React's unmount cleanup, which runs
// after the test's own hooks.
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:recorded-clip');
  URL.revokeObjectURL = jest.fn();
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('HermesWaVoiceRecorder', () => {
  const originalMediaRecorder = window.MediaRecorder;
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    MediaRecorderStub.instances = [];
    trackStop.mockClear();

    getUserMedia.mockReset();
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: trackStop }],
    });

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MediaRecorderStub,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });

    jest.mocked(URL.createObjectURL).mockClear();
    jest.mocked(URL.revokeObjectURL).mockClear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: originalMediaRecorder,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: originalMediaDevices,
    });
  });

  // The single most important behaviour in this module.
  it('does not open the microphone on mount', () => {
    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(MediaRecorderStub.instances).toHaveLength(0);
  });

  it('does not open the microphone on a re-render either', () => {
    const { rerender } = renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    rerender(
      <I18nProvider i18n={i18n}>
        <HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} maxDurationMs={60_000} />
      </I18nProvider>,
    );

    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('opens the microphone only when a person presses Record', async () => {
    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    await userEvent.click(screen.getByRole('button', { name: /record/i }));

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });

    // The elapsed time is announced in a status region while recording.
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/recording/i);
  });

  it('stops into a review and sends nothing', async () => {
    const onSubmitRequested = jest.fn();

    renderRecorder(
      <HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} onSubmitRequested={onSubmitRequested} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));
    await screen.findByRole('button', { name: /stop/i });

    await userEvent.click(screen.getByRole('button', { name: /stop/i }));

    // A clip exists and is offered for review...
    expect(
      await screen.findByRole('button', { name: /send this voice message/i }),
    ).toBeInTheDocument();

    // ...and stopping did not call the parent's send.
    expect(onSubmitRequested).not.toHaveBeenCalled();

    // The tracks were released as soon as capture ended.
    expect(trackStop).toHaveBeenCalled();
  });

  it('hands the clip over only on the separate send press', async () => {
    const onSubmitRequested = jest.fn();

    renderRecorder(
      <HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} onSubmitRequested={onSubmitRequested} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));
    await screen.findByRole('button', { name: /stop/i });
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));

    await userEvent.click(
      await screen.findByRole('button', { name: /send this voice message/i }),
    );

    expect(onSubmitRequested).toHaveBeenCalledTimes(1);

    const clip = onSubmitRequested.mock.calls[0][0] as HermesWaRecordedClip;
    expect(clip.byteSize).toBeGreaterThan(0);
    expect(clip.previewUrl).toBe('blob:recorded-clip');
    // The contract refuses a declared type carrying parameters.
    expect(clip.mimeType).toBe('audio/webm');
  });

  it('is readable and closed when no provider is configured, which is the default', () => {
    renderRecorder(<HermesWaVoiceRecorder />);

    expect(
      screen.getByText(/no whatsapp provider is configured/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^record$/i })).toBeDisabled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('offers no send button at all when the parent gave no send handler', async () => {
    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));
    await screen.findByRole('button', { name: /stop/i });
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(
      await screen.findByText(/sending is not available on this screen/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /send this voice message/i }),
    ).not.toBeInTheDocument();
  });

  it('says a refused permission was refused, and lets the person ask again', async () => {
    getUserMedia.mockRejectedValue({ name: 'NotAllowedError' });

    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/microphone access was refused/i);
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('does not report a missing microphone as a refused permission', async () => {
    getUserMedia.mockRejectedValue({ name: 'NotFoundError' });

    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no microphone was found/i,
    );
  });

  it('does not report a busy device as a refused permission', async () => {
    getUserMedia.mockRejectedValue({ name: 'NotReadableError' });

    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not be opened/i,
    );
  });

  it('closes the Record button when the browser cannot record at all', () => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: undefined,
    });

    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /cannot record audio/i,
    );
    expect(screen.getByRole('button', { name: /^record$/i })).toBeDisabled();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('releases the tracks and the preview URL when the recording is cancelled', async () => {
    const onCancelled = jest.fn();

    renderRecorder(<HermesWaVoiceRecorder recordingCapability={OPEN} sendCapability={OPEN} onCancelled={onCancelled} />);

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));
    await screen.findByRole('button', { name: /stop/i });
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));
    await userEvent.click(
      await screen.findByRole('button', { name: /discard/i }),
    );

    expect(onCancelled).toHaveBeenCalledTimes(1);
    expect(trackStop).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recorded-clip');
    expect(
      screen.getByRole('button', { name: /^record$/i }),
    ).toBeInTheDocument();
  });

  it('says why sending is closed instead of greying the button out in silence', async () => {
    renderRecorder(
      <HermesWaVoiceRecorder
        recordingCapability={OPEN}
        sendCapability={{
          kind: 'unavailable',
          reason: 'WhatsApp is not connected for this workspace.',
        }}
        onSubmitRequested={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^record$/i }));
    await screen.findByRole('button', { name: /stop/i });
    await userEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(
      await screen.findByRole('button', { name: /send this voice message/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/whatsapp is not connected for this workspace/i),
    ).toBeInTheDocument();
  });
});
