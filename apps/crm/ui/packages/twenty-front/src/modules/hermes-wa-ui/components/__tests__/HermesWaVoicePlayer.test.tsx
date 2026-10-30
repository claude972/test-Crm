import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { HermesWaVoicePlayer } from '@/hermes-wa-ui/components/HermesWaVoicePlayer';

const renderPlayer = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

const getAudio = (): HTMLAudioElement => {
  const audio = document.querySelector('audio');

  if (audio === null) {
    throw new Error('no audio element rendered');
  }

  return audio;
};

describe('HermesWaVoicePlayer', () => {
  const originalPlay = window.HTMLMediaElement.prototype.play;
  const originalPause = window.HTMLMediaElement.prototype.pause;

  afterEach(() => {
    window.HTMLMediaElement.prototype.play = originalPlay;
    window.HTMLMediaElement.prototype.pause = originalPause;
  });

  it('says a voice message has not been loaded, absent being the default', () => {
    renderPlayer(<HermesWaVoicePlayer />);

    expect(screen.getByText(/has not been loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps a lapsed access apart, and offers to load again when it can', () => {
    const onSourceRefreshRequested = jest.fn();

    renderPlayer(
      <HermesWaVoicePlayer
        source={{ kind: 'expired' }}
        onSourceRefreshRequested={onSourceRefreshRequested}
      />,
    );

    expect(screen.getByText(/has lapsed/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /load this voice message/i }),
    ).toBeInTheDocument();
  });

  it('announces a source being fetched as progress', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolving' }} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('exposes a progress bar whose value starts at zero', () => {
    renderPlayer(
      <HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={10_000} />,
    );

    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveAttribute('aria-valuetext', '0:00 of 0:10');
  });

  it('keeps the progress bar indeterminate when no length is known', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={null} />);

    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).not.toHaveAttribute('aria-valuenow');
    expect(progressBar).toHaveAttribute(
      'aria-valuetext',
      '0:00, total length unknown',
    );
    expect(screen.getByText(/length unknown/i)).toBeInTheDocument();
  });

  it('keeps the progress value up to date as the audio advances', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={10_000} />);

    const audio = getAudio();

    act(() => {
      Object.defineProperty(audio, 'currentTime', {
        configurable: true,
        value: 2.5,
      });
      audio.dispatchEvent(new Event('timeupdate'));
    });

    const progressBar = screen.getByRole('progressbar');

    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuetext', '0:02 of 0:10');
  });

  it('prefers the length the file itself reports over the one it was given', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={10_000} />);

    const audio = getAudio();

    act(() => {
      Object.defineProperty(audio, 'duration', {
        configurable: true,
        value: 42,
      });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      '0:00 of 0:42',
    );
  });

  it('follows its state in the button label, not only in the icon', async () => {
    window.HTMLMediaElement.prototype.play = jest
      .fn()
      .mockImplementation(function play(this: HTMLMediaElement) {
        Object.defineProperty(this, 'paused', {
          configurable: true,
          value: false,
        });
        return Promise.resolve();
      });
    window.HTMLMediaElement.prototype.pause = jest
      .fn()
      .mockImplementation(function pause(this: HTMLMediaElement) {
        Object.defineProperty(this, 'paused', {
          configurable: true,
          value: true,
        });
      });

    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={10_000} />);

    await userEvent.click(
      screen.getByRole('button', { name: /play voice message/i }),
    );

    const pauseButton = await screen.findByRole('button', {
      name: /pause voice message/i,
    });

    await userEvent.click(pauseButton);

    expect(
      await screen.findByRole('button', { name: /play voice message/i }),
    ).toBeInTheDocument();
  });

  it('names the clip in the labels when it was given a name', () => {
    renderPlayer(
      <HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={1000} label="note.ogg" />,
    );

    expect(
      screen.getByRole('button', { name: 'Play voice message note.ogg' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-label',
      'Progress of voice message note.ogg',
    );
  });

  it('shows a playback failure when the browser refuses the file', async () => {
    window.HTMLMediaElement.prototype.play = jest
      .fn()
      .mockRejectedValue(new DOMException('no decoder', 'NotSupportedError'));

    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={1000} />);

    await userEvent.click(
      screen.getByRole('button', { name: /play voice message/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /could not open the audio file/i,
    );
    // The button goes back to its resting label, so a second attempt is
    // obviously possible.
    expect(
      screen.getByRole('button', { name: /play voice message/i }),
    ).toBeInTheDocument();
  });

  it('shows a failure when the element itself errors', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={1000} />);

    act(() => {
      getAudio().dispatchEvent(new Event('error'));
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      /could not open the audio file/i,
    );
  });

  it('does not autoplay and fetches only the metadata', () => {
    renderPlayer(<HermesWaVoicePlayer source={{ kind: 'resolved', objectUrl: 'blob:clip' }} durationMs={1000} />);

    const audio = getAudio();

    expect(audio.hasAttribute('autoplay')).toBe(false);
    expect(audio.getAttribute('preload')).toBe('metadata');
  });
});
