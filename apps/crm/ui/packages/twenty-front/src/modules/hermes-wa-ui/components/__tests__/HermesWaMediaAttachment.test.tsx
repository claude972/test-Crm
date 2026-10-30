import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

import { HermesWaMediaAttachment } from '@/hermes-wa-ui/components/HermesWaMediaAttachment';
import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import { readHermesWaMediaKind } from '@/hermes-wa-ui/types/HermesWaMediaKind';
import { readHermesWaMediaState } from '@/hermes-wa-ui/types/HermesWaMediaState';
import { type HermesWaMediaSource } from '@/hermes-wa-ui/types/HermesWaMediaSource';

const buildMedia = (overrides: Partial<HermesWaMedia> = {}): HermesWaMedia => ({
  id: 'md-1',
  kind: readHermesWaMediaKind('IMAGE'),
  state: readHermesWaMediaState('READY'),
  name: 'plan-pose-vitrine.png',
  byteSize: 2 * 1024 * 1024,
  mimeType: 'image/png',
  alt: null,
  durationMs: null,
  errorCode: null,
  ...overrides,
});

const RESOLVED: HermesWaMediaSource = {
  kind: 'resolved',
  objectUrl: 'blob:plan',
};

const renderAttachment = (node: ReactNode) =>
  render(<I18nProvider i18n={i18n}>{node}</I18nProvider>);

describe('HermesWaMediaAttachment', () => {
  it('renders a ready image from the resolved blob URL, never from a path', () => {
    renderAttachment(
      <HermesWaMediaAttachment media={buildMedia()} source={RESOLVED} />,
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'blob:plan');
    expect(image).toHaveAttribute('alt', 'plan-pose-vitrine.png');
    expect(screen.getByText(/plan-pose-vitrine\.png/)).toBeInTheDocument();
  });

  it('shows nothing until a source is resolved, source absent being the default', () => {
    renderAttachment(<HermesWaMediaAttachment media={buildMedia()} />);

    expect(screen.getByText(/not loaded/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('prefers the sender description over the file name for the alt text', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ alt: 'Shopfront layout, two panes' })}
        source={RESOLVED}
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'alt',
      'Shopfront layout, two panes',
    );
  });

  it.each([
    ['PENDING_FETCH', /not fetched yet/i],
    ['UPLOADING', /upload in progress/i],
    ['PROCESSING', /being processed/i],
    ['FAILED', /attachment unavailable/i],
    ['QUARANTINED', /withheld/i],
    ['EXPIRED', /attachment expired/i],
  ])('says why a %s attachment is not shown', (state, expected) => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ state: readHermesWaMediaState(state) })}
        source={RESOLVED}
      />,
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
    // The message stays readable: the descriptor is still there.
    expect(screen.getByText(/plan-pose-vitrine\.png/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps a lapsed access apart from a lapsed media', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia()}
        source={{ kind: 'expired' }}
      />,
    );

    expect(screen.getByText(/access expired/i)).toBeInTheDocument();
    expect(screen.getByText(/short-lived access/i)).toBeInTheDocument();
  });

  it('announces a source being fetched as progress, not as a failure', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia()}
        source={{ kind: 'resolving' }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('does not render an attachment whose state it cannot read', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ state: readHermesWaMediaState('SOMETHING_NEW') })}
        source={RESOLVED}
      />,
    );

    expect(screen.getByText(/state not recognised/i)).toBeInTheDocument();
    // The server's own word, kept verbatim so the gap is reportable.
    expect(screen.getByText('SOMETHING_NEW')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not pick a renderer for a kind it cannot read', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ kind: readHermesWaMediaKind('STICKER') })}
        source={RESOLVED}
      />,
    );

    expect(screen.getByText(/type not recognised/i)).toBeInTheDocument();
    expect(screen.getByText('STICKER')).toBeInTheDocument();
  });

  it('shows the server error code verbatim when there is one', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({
          state: readHermesWaMediaState('FAILED'),
          errorCode: 'MEDIA_FETCH_REFUSED',
        })}
        source={RESOLVED}
      />,
    );

    expect(screen.getByText('MEDIA_FETCH_REFUSED')).toBeInTheDocument();
  });

  it('offers a fresh access only for a source problem, and only with a handler', () => {
    const onSourceRefreshRequested = jest.fn();

    const { rerender } = renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia()}
        source={{ kind: 'expired' }}
        onSourceRefreshRequested={onSourceRefreshRequested}
      />,
    );

    expect(
      screen.getByRole('button', { name: /load this attachment/i }),
    ).toBeInTheDocument();

    // No handler means no button, even where loading would make sense.
    rerender(
      <I18nProvider i18n={i18n}>
        <HermesWaMediaAttachment
          media={buildMedia()}
          source={{ kind: 'expired' }}
        />
      </I18nProvider>,
    );

    expect(
      screen.queryByRole('button', { name: /load this attachment/i }),
    ).not.toBeInTheDocument();
  });

  it('never offers a retry on a withheld attachment', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ state: readHermesWaMediaState('QUARANTINED') })}
        source={RESOLVED}
        onRetryRequested={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /request this attachment again/i }),
    ).not.toBeInTheDocument();
  });

  it('offers a retry on a failed attachment when a handler is given', async () => {
    const onRetryRequested = jest.fn();

    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({ state: readHermesWaMediaState('FAILED') })}
        source={RESOLVED}
        onRetryRequested={onRetryRequested}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /request this attachment again/i }),
    );

    expect(onRetryRequested).toHaveBeenCalledTimes(1);
  });

  it('says downloading is unavailable instead of offering a dead button', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({
          kind: readHermesWaMediaKind('FILE'),
          name: 'devis.pdf',
          mimeType: 'application/pdf',
        })}
        source={RESOLVED}
      />,
    );

    expect(
      screen.getByText(/downloading is not available on this screen/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /download/i }),
    ).not.toBeInTheDocument();
  });

  it('reports a download intent to the parent instead of fetching anything', async () => {
    const onDownloadRequested = jest.fn();

    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({
          kind: readHermesWaMediaKind('FILE'),
          name: 'devis.pdf',
        })}
        source={RESOLVED}
        onDownloadRequested={onDownloadRequested}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(onDownloadRequested).toHaveBeenCalledTimes(1);
    expect(onDownloadRequested.mock.calls[0][0].name).toBe('devis.pdf');
  });

  it('gives a voice attachment a labelled play button and a live progress bar', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({
          kind: readHermesWaMediaKind('VOICE'),
          name: 'note.ogg',
          durationMs: 8000,
        })}
        source={{ kind: 'resolved', objectUrl: 'blob:note' }}
      />,
    );

    expect(
      screen.getByRole('button', { name: /play voice message note\.ogg/i }),
    ).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('does not autoplay a video and leaves the native controls in place', () => {
    renderAttachment(
      <HermesWaMediaAttachment
        media={buildMedia({
          kind: readHermesWaMediaKind('VIDEO'),
          name: 'pose.mp4',
        })}
        source={{ kind: 'resolved', objectUrl: 'blob:pose' }}
      />,
    );

    const video = document.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.hasAttribute('autoplay')).toBe(false);
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.getAttribute('preload')).toBe('metadata');
    expect(video?.getAttribute('src')).toBe('blob:pose');
  });
});
