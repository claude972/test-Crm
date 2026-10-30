import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { type ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconClock,
  IconDownload,
  IconHelpCircle,
  IconLoader,
  IconLock,
  IconUpload,
} from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaMediaDescriptor } from '@/hermes-wa-ui/components/HermesWaMediaDescriptor';
import {
  HermesWaCode,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { type HermesWaMedia } from '@/hermes-wa-ui/types/HermesWaMedia';
import { type HermesWaMediaUnavailableReason } from '@/hermes-wa-ui/utils/readHermesWaMediaAvailability';

// Dashed, never a grey rectangle the size of the missing picture: a
// placeholder shaped like the content invites a reload that will not help.
const StyledBlock = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px dashed ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledHeading = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: inline-flex;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  overflow-wrap: anywhere;

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

type HermesWaMediaUnavailableProps = {
  media: HermesWaMedia;
  reason: HermesWaMediaUnavailableReason;
  // Asks the owner of the media API for the media itself again. Offered only
  // where the media's own state can change.
  onRetryRequested?: (media: HermesWaMedia) => void;
  // Asks the parent to fetch the bytes again and hand over a fresh blob: URL.
  // Offered only where the access, not the media, is the problem.
  onSourceRefreshRequested?: (media: HermesWaMedia) => void;
};

// Why a media is not on screen, and what is still known about it. Eleven
// reasons, eleven sentences: a quarantined file must not be retried, an
// expired access has to be asked for again, a processing file arrives on its
// own. The reason is a heading in words with an icon beside it, over the
// descriptor line that keeps the message readable.
export const HermesWaMediaUnavailable = ({
  media,
  reason,
  onRetryRequested,
  onSourceRefreshRequested,
}: HermesWaMediaUnavailableProps) => {
  const { t } = useLingui();

  const presentation: {
    heading: string;
    icon: ReactNode;
    guidance: string | null;
    // 'media' asks for the media again, 'source' for a fresh access, 'none'
    // offers nothing because nothing a click can do would help.
    retry: 'media' | 'source' | 'none';
    isProgress: boolean;
  } =
    reason === 'pendingFetch'
      ? {
          heading: t`Attachment not fetched yet`,
          icon: <IconDownload />,
          guidance: t`The provider still holds it. The message itself is complete.`,
          retry: 'media',
          isProgress: false,
        }
      : reason === 'uploading'
        ? {
            heading: t`Upload in progress`,
            icon: <IconUpload />,
            guidance: t`This workspace is still sending the file.`,
            retry: 'none',
            isProgress: true,
          }
        : reason === 'processing'
          ? {
              heading: t`Attachment being processed`,
              icon: <IconLoader />,
              guidance: t`It will be available once processing finishes. Nothing to do.`,
              retry: 'none',
              isProgress: true,
            }
          : reason === 'failed'
            ? {
                heading: t`Attachment unavailable`,
                icon: <IconAlertTriangle />,
                guidance: t`It could not be retrieved. Ask the sender to send it again.`,
                retry: 'media',
                isProgress: false,
              }
            : reason === 'quarantined'
              ? {
                  // Deliberately no retry: this is a decision, not a
                  // transport failure, and a button would suggest otherwise.
                  heading: t`Attachment withheld`,
                  icon: <IconLock />,
                  guidance: t`It was held back on purpose and will not be opened here.`,
                  retry: 'none',
                  isProgress: false,
                }
              : reason === 'expired'
                ? {
                    heading: t`Attachment expired`,
                    icon: <IconClock />,
                    guidance: t`The provider no longer keeps it. Ask the sender to send it again.`,
                    retry: 'media',
                    isProgress: false,
                  }
                : reason === 'sourceAbsent'
                  ? {
                      heading: t`Attachment not loaded`,
                      icon: <IconDownload />,
                      guidance: t`The file is ready. Loading it is a separate step, because it needs an authorised request.`,
                      retry: 'source',
                      isProgress: false,
                    }
                  : reason === 'sourceResolving'
                    ? {
                        heading: t`Loading the attachment…`,
                        icon: <IconLoader />,
                        guidance: null,
                        retry: 'none',
                        isProgress: true,
                      }
                    : reason === 'sourceExpired'
                      ? {
                          // The access lapsed, not the file: sixty seconds is
                          // the documented lifetime.
                          heading: t`Attachment access expired`,
                          icon: <IconClock />,
                          guidance: t`The short-lived access to this file has lapsed. Loading it again gets a new one.`,
                          retry: 'source',
                          isProgress: false,
                        }
                      : reason === 'unknownKind'
                        ? {
                            heading: t`Attachment type not recognised`,
                            icon: <IconHelpCircle />,
                            guidance: t`This version of the app cannot display it. The details below are what the server reported.`,
                            retry: 'none',
                            isProgress: false,
                          }
                        : {
                            heading: t`Attachment state not recognised`,
                            icon: <IconHelpCircle />,
                            guidance: t`The state the server reported is not one this version knows, so the file is not opened.`,
                            retry: 'none',
                            isProgress: false,
                          };

  // The raw value behind an unreadable state or kind, verbatim so the gap is
  // reportable.
  const rawValue =
    reason === 'unknownState' && media.state.kind === 'unknown'
      ? media.state.raw
      : reason === 'unknownKind' && media.kind.kind === 'unknown'
        ? media.kind.raw
        : null;

  return (
    <StyledBlock>
      <StyledHeading role={presentation.isProgress ? 'status' : undefined}>
        {presentation.icon}
        {presentation.heading}
      </StyledHeading>

      <HermesWaMediaDescriptor media={media} />

      {presentation.guidance !== null && (
        <HermesWaNote>{presentation.guidance}</HermesWaNote>
      )}

      {isNonEmptyString(rawValue) && <HermesWaCode>{rawValue}</HermesWaCode>}

      {isNonEmptyString(media.errorCode) && (
        <HermesWaCode>{media.errorCode}</HermesWaCode>
      )}

      {presentation.retry === 'media' && onRetryRequested !== undefined && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRetryRequested(media)}
        >
          {t`Request this attachment again`}
        </Button>
      )}

      {presentation.retry === 'source' &&
        onSourceRefreshRequested !== undefined && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSourceRefreshRequested(media)}
          >
            {t`Load this attachment`}
          </Button>
        )}
    </StyledBlock>
  );
};
