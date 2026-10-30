import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconPlayerPause, IconPlayerPlay } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import {
  HERMES_WA_ABSENT_MEDIA_SOURCE,
  type HermesWaMediaSource,
} from '@/hermes-wa-ui/types/HermesWaMediaSource';
import { formatHermesWaDuration } from '@/hermes-wa-ui/utils/formatHermesWaDuration';

const StyledPlayer = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.pill};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  @media (max-width: 480px) {
    border-radius: ${themeCssVariables.border.radius.md};
  }
`;

// 40px square: a comfortable touch target that still fits the pill.
const StyledButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.accent.primary};
  block-size: 40px;
  border: 1px solid ${themeCssVariables.accent.primary};
  border-radius: 50%;
  color: ${themeCssVariables.font.color.onAccent};
  cursor: pointer;
  display: inline-flex;
  flex: none;
  inline-size: 40px;
  justify-content: center;
  padding: 0;

  & > svg {
    block-size: 18px;
    inline-size: 18px;
    stroke-width: ${themeCssVariables.icon.stroke.md};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: 2px;
  }
`;

const StyledTrack = styled.div`
  background: ${themeCssVariables.border.color.strong};
  block-size: 4px;
  border-radius: 2px;
  flex: 1 1 120px;
  min-width: 60px;
  overflow: hidden;
`;

const StyledProgress = styled.div`
  background: ${themeCssVariables.accent.primary};
  block-size: 100%;
  border-radius: 2px;

  /* Striped when the length is unknown, so it does not look like 0% played. */
  &[data-indeterminate='true'] {
    background: repeating-linear-gradient(
      90deg,
      ${themeCssVariables.border.color.strong} 0 6px,
      transparent 6px 12px
    );
    inline-size: 100%;
  }
`;

const StyledTime = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex: none;
  font-size: ${themeCssVariables.font.size.xs};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const StyledFullWidth = styled.div`
  flex: 1 1 100%;
  min-width: 0;
`;

type HermesWaVoicePlayerProps = {
  // Already resolved by the parent. This component never builds an address:
  // the contract's media path needs a session header an <audio> will not
  // send, so only a blob: URL can be played.
  source?: HermesWaMediaSource;
  // The length as the caller knows it, until the file reports its own.
  durationMs?: number | null;
  // Names this clip in the button's accessible label, so several players in
  // one thread are told apart.
  label?: string | null;
  // Asks the parent for a fresh access. Absent means asking is not available
  // here, and no button pretends otherwise.
  onSourceRefreshRequested?: () => void;
};

// A voice message player: one button whose accessible name follows its action
// and one real role="progressbar" whose value tracks the audio. With no known
// length the bar stays indeterminate rather than reporting a percentage of an
// unknown total. Nothing plays on its own — no autoplay, metadata only — so
// opening a thread starts no sound and fetches no audio.
export const HermesWaVoicePlayer = ({
  source = HERMES_WA_ABSENT_MEDIA_SOURCE,
  durationMs = null,
  label = null,
  onSourceRefreshRequested,
}: HermesWaVoicePlayerProps) => {
  const { t } = useLingui();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  // The length the file itself reports. Null until read, and for a stream
  // whose length is not finite.
  const [reportedDurationMs, setReportedDurationMs] = useState<number | null>(
    null,
  );
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  const objectUrl = source.kind === 'resolved' ? source.objectUrl.trim() : '';

  // Leaving the thread must not leave a voice note playing.
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  // A new source is a different clip: the old position and the old failure
  // belong to the previous one.
  useEffect(() => {
    setIsPlaying(false);
    setPositionMs(0);
    setReportedDurationMs(null);
    setHasPlaybackError(false);
  }, [objectUrl]);

  const totalMs =
    reportedDurationMs !== null
      ? reportedDurationMs
      : typeof durationMs === 'number' &&
          Number.isFinite(durationMs) &&
          durationMs > 0
        ? durationMs
        : null;

  const handleToggle = useCallback(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setHasPlaybackError(false);

    // play() rejects when the browser will not decode the file or refuses the
    // gesture. Both are shown; neither is swallowed.
    const played: unknown = audio.play();

    if (played instanceof Promise) {
      played
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
          setHasPlaybackError(true);
        });

      return;
    }

    setIsPlaying(true);
  }, []);

  if (objectUrl.length === 0) {
    return (
      <StyledPlayer>
        <StyledFullWidth>
          <HermesWaNote role={source.kind === 'resolving' ? 'status' : undefined}>
            {source.kind === 'resolving'
              ? t`Loading this voice message…`
              : source.kind === 'expired'
                ? t`The short-lived access to this voice message has lapsed.`
                : t`This voice message has not been loaded.`}
          </HermesWaNote>
        </StyledFullWidth>

        {source.kind !== 'resolving' &&
          onSourceRefreshRequested !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSourceRefreshRequested}
            >
              {t`Load this voice message`}
            </Button>
          )}
      </StyledPlayer>
    );
  }

  const positionLabel = formatHermesWaDuration(positionMs) ?? '0:00';
  const totalLabel = formatHermesWaDuration(totalMs);

  const progressPercent =
    totalMs !== null && totalMs > 0
      ? Math.min(100, Math.max(0, Math.round((positionMs / totalMs) * 100)))
      : null;

  const clipName = label?.trim();
  const hasClipName = clipName !== undefined && clipName.length > 0;

  const buttonLabel = isPlaying
    ? hasClipName
      ? t`Pause voice message ${clipName}`
      : t`Pause voice message`
    : hasClipName
      ? t`Play voice message ${clipName}`
      : t`Play voice message`;

  const progressLabel = hasClipName
    ? t`Progress of voice message ${clipName}`
    : t`Voice message progress`;

  return (
    <StyledPlayer>
      <StyledButton type="button" onClick={handleToggle} aria-label={buttonLabel}>
        {isPlaying ? <IconPlayerPause /> : <IconPlayerPlay />}
      </StyledButton>

      <StyledTrack
        role="progressbar"
        aria-label={progressLabel}
        aria-valuemin={progressPercent === null ? undefined : 0}
        aria-valuemax={progressPercent === null ? undefined : 100}
        aria-valuenow={progressPercent === null ? undefined : progressPercent}
        aria-valuetext={
          totalLabel === null
            ? t`${positionLabel}, total length unknown`
            : t`${positionLabel} of ${totalLabel}`
        }
      >
        <StyledProgress
          data-indeterminate={progressPercent === null ? 'true' : 'false'}
          style={
            progressPercent === null
              ? undefined
              : { inlineSize: `${progressPercent}%` }
          }
        />
      </StyledTrack>

      <StyledTime>
        {totalLabel === null
          ? t`${positionLabel} · length unknown`
          : `${positionLabel} / ${totalLabel}`}
      </StyledTime>

      {/* Metadata only: the bytes load when someone presses play. */}
      <audio
        ref={audioRef}
        src={objectUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;

          setReportedDurationMs(
            Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null,
          );
        }}
        onTimeUpdate={(event) => {
          setPositionMs(event.currentTarget.currentTime * 1000);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setPositionMs(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setHasPlaybackError(true);
        }}
      />

      {hasPlaybackError && (
        <StyledFullWidth>
          <HermesWaAlertNote role="alert">
            {t`This browser could not open the audio file. The message itself is unaffected.`}
          </HermesWaAlertNote>
        </StyledFullWidth>
      )}
    </StyledPlayer>
  );
};
