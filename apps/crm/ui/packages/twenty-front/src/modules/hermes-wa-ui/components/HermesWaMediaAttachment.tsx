import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useState } from 'react';
import { IconPaperclip } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaMediaDescriptor } from '@/hermes-wa-ui/components/HermesWaMediaDescriptor';
import { HermesWaMediaUnavailable } from '@/hermes-wa-ui/components/HermesWaMediaUnavailable';
import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { HermesWaVoicePlayer } from '@/hermes-wa-ui/components/HermesWaVoicePlayer';
import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import {
  HERMES_WA_ABSENT_MEDIA_SOURCE,
  type HermesWaMediaSource,
} from '@/hermes-wa-ui/types/HermesWaMediaSource';
import { readHermesWaMediaAvailability } from '@/hermes-wa-ui/utils/readHermesWaMediaAvailability';

const StyledFrame = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

// Full bubble width, capped so one picture does not stretch the thread. The
// cap goes at phone width, where the bubble is already the limit.
const StyledVisual = styled.img`
  background: ${themeCssVariables.background.tertiary};
  block-size: auto;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: block;
  inline-size: 100%;
  max-inline-size: 340px;

  @media (max-width: 480px) {
    max-inline-size: 100%;
  }
`;

const StyledVideo = styled.video`
  background: ${themeCssVariables.background.tertiary};
  block-size: auto;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: block;
  inline-size: 100%;
  max-inline-size: 340px;

  @media (max-width: 480px) {
    max-inline-size: 100%;
  }
`;

const StyledFileRow = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]};

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.md} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.md} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.md};
  }
`;

const StyledFileInfo = styled.div`
  display: grid;
  flex: 1 1 140px;
  gap: 2px;
  min-width: 0;
`;

const StyledFileName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

type HermesWaMediaAttachmentProps = {
  media: HermesWaMedia;
  // The bytes, already fetched and wrapped in a blob: URL by the parent. It
  // defaults to absent: no access until someone proves otherwise.
  source?: HermesWaMediaSource;
  // A person asked for the file. Absent means this screen cannot hand files
  // over, which is said rather than offered as a button that does nothing.
  onDownloadRequested?: (media: HermesWaMedia) => void;
  // A person asked for the media itself again.
  onRetryRequested?: (media: HermesWaMedia) => void;
  // A person asked the parent to fetch the bytes and hand over a fresh
  // blob: URL.
  onSourceRefreshRequested?: (media: HermesWaMedia) => void;
};

// One media inside a bubble. Nothing renders until
// `readHermesWaMediaAvailability` says it may, and it answers no by default:
// an unreadable state or kind, or a source the parent has not resolved, is
// described in words rather than handed to an <img> that would show a broken
// icon. The video never autoplays and keeps the browser's own controls.
export const HermesWaMediaAttachment = ({
  media,
  source = HERMES_WA_ABSENT_MEDIA_SOURCE,
  onDownloadRequested,
  onRetryRequested,
  onSourceRefreshRequested,
}: HermesWaMediaAttachmentProps) => {
  const { t } = useLingui();

  const [hasLoadError, setHasLoadError] = useState(false);

  const availability = readHermesWaMediaAvailability(media, source);
  const objectUrl =
    availability.kind === 'renderable' ? availability.objectUrl : null;

  // A new media, or a fresh access for the same one, is a new attempt.
  useEffect(() => {
    setHasLoadError(false);
  }, [media.id, objectUrl]);

  if (availability.kind === 'unavailable') {
    return (
      <HermesWaMediaUnavailable
        media={media}
        reason={availability.reason}
        onRetryRequested={onRetryRequested}
        onSourceRefreshRequested={onSourceRefreshRequested}
      />
    );
  }

  // Availability already refuses an unknown kind; this narrows rather than
  // asserts.
  if (media.kind.kind === 'unknown') {
    return <HermesWaMediaUnavailable media={media} reason="unknownKind" />;
  }

  const name = media.name?.trim();
  const alt = media.alt?.trim();

  if (media.kind.mediaKind === 'IMAGE') {
    // A blob: URL can be revoked under a rendered image, so the failure is a
    // state of its own and not the same fact as the server's.
    if (hasLoadError) {
      return (
        <StyledFrame>
          <HermesWaAlertNote role="alert">
            {t`This image could not be loaded.`}
          </HermesWaAlertNote>
          <HermesWaMediaDescriptor media={media} />
        </StyledFrame>
      );
    }

    return (
      <StyledFrame>
        {/* The sender's description first, then the file name. An empty alt
            is the last resort and is right: inventing a description of a
            picture nobody described would be worse than silence, and the
            descriptor line below carries the file's identity. */}
        <StyledVisual
          src={availability.objectUrl}
          alt={isNonEmptyString(alt) ? alt : isNonEmptyString(name) ? name : ''}
          onError={() => setHasLoadError(true)}
        />
        <HermesWaMediaDescriptor media={media} />
      </StyledFrame>
    );
  }

  if (media.kind.mediaKind === 'VIDEO') {
    return (
      <StyledFrame>
        <StyledVideo
          src={availability.objectUrl}
          controls
          preload="metadata"
          playsInline
          onError={() => setHasLoadError(true)}
        />
        {hasLoadError && (
          <HermesWaAlertNote role="alert">
            {t`This browser could not open the video file.`}
          </HermesWaAlertNote>
        )}
        <HermesWaMediaDescriptor media={media} />
      </StyledFrame>
    );
  }

  if (media.kind.mediaKind === 'VOICE') {
    return (
      <StyledFrame>
        <HermesWaVoicePlayer
          source={source}
          durationMs={media.durationMs}
          label={isNonEmptyString(name) ? name : null}
          onSourceRefreshRequested={
            onSourceRefreshRequested === undefined
              ? undefined
              : () => onSourceRefreshRequested(media)
          }
        />
        <HermesWaMediaDescriptor media={media} />
      </StyledFrame>
    );
  }

  return (
    <StyledFileRow>
      <IconPaperclip />

      <StyledFileInfo>
        <StyledFileName>
          {isNonEmptyString(name) ? name : t`Unnamed file`}
        </StyledFileName>
        <HermesWaMediaDescriptor media={media} />
      </StyledFileInfo>

      {onDownloadRequested === undefined ? (
        // No handler means no way to hand the file over. A disabled button
        // with no words would read as a bug.
        <HermesWaNote>{t`Downloading is not available on this screen.`}</HermesWaNote>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDownloadRequested(media)}
        >
          {t`Download`}
        </Button>
      )}
    </StyledFileRow>
  );
};
