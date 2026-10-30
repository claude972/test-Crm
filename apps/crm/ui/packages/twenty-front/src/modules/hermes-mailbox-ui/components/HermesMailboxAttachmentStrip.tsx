import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconPaperclip, IconX } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { readHermesMailboxFileSize } from '@/hermes-mailbox-ui/utils/readHermesMailboxCount';

const StyledStrip = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  margin-top: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledStripTitle = styled.h4`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.05em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledList = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: 0;
`;

const StyledRow = styled.li`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[1.5]} ${themeCssVariables.spacing[2]};

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    color: ${themeCssVariables.font.color.tertiary};
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.sm} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.sm};
  }
`;

const StyledFile = styled.span`
  display: grid;
  flex: 1;
  min-width: 0;
`;

const StyledFileName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow-wrap: anywhere;
`;

const StyledFileMeta = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow-wrap: anywhere;
`;

type HermesMailboxAttachmentStripProps = {
  // Already translated: "Attachments" when reading, "Forwarded attachments"
  // when composing.
  title: string;
  attachments: HermesMailboxAttachment[];
  // Present only in the forward editor, where taking a file out is meaningful.
  onRemoveAttachment?: (attachmentId: string) => void;
  // Names a human took out, so the removal stays visible afterwards.
  removedNames?: string[];
};

// The attachment strip, used under a message and inside the editor.
//
// It names files and never fetches one. The download control is present and
// disabled with its reason on screen: a file's bytes need a private import
// that is not built yet, and metadata is not an enabled action.
export const HermesMailboxAttachmentStrip = ({
  title,
  attachments,
  onRemoveAttachment,
  removedNames = [],
}: HermesMailboxAttachmentStripProps) => {
  const { t, i18n } = useLingui();

  if (attachments.length === 0 && removedNames.length === 0) {
    return null;
  }

  const describeMeta = (attachment: HermesMailboxAttachment): string => {
    const size = readHermesMailboxFileSize(attachment.sizeBytes);
    const type = isNonEmptyString(attachment.mimeType)
      ? attachment.mimeType
      : t`Type unknown`;

    if (size.kind === 'unknown') {
      return t`${type} · size unknown`;
    }

    const formattedSize = i18n.number(size.value, {
      style: 'unit',
      unit: size.unit,
      unitDisplay: 'short',
    });

    return t`${type} · ${formattedSize}`;
  };

  const describeUnavailability = (
    attachment: HermesMailboxAttachment,
  ): string => {
    if (attachment.availability.kind === 'privateImportRequired') {
      return t`Not downloadable yet: this file still has to be imported privately.`;
    }

    if (attachment.availability.kind === 'unavailable') {
      return isNonEmptyString(attachment.availability.reason)
        ? t`The provider cannot serve this file: ${attachment.availability.reason}`
        : t`The provider cannot serve this file.`;
    }

    return t`Whether this file can be served is unknown, so it is not offered.`;
  };

  return (
    <StyledStrip>
      <StyledStripTitle>{title}</StyledStripTitle>

      {attachments.length > 0 && (
        <StyledList>
          {attachments.map((attachment) => {
            const name = isNonEmptyString(attachment.name)
              ? attachment.name
              : t`Unnamed file`;
            const reason = describeUnavailability(attachment);

            return (
              <StyledRow key={attachment.id}>
                <IconPaperclip aria-hidden="true" />
                <StyledFile>
                  {/* Provider-sourced, rendered as text: a file name is
                      attacker-controlled in received mail. */}
                  <StyledFileName>{name}</StyledFileName>
                  <StyledFileMeta>{describeMeta(attachment)}</StyledFileMeta>
                  {/* The reason is on screen, not only in a tooltip. */}
                  <StyledFileMeta>{reason}</StyledFileMeta>
                </StyledFile>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  aria-describedby={undefined}
                  aria-label={t`Download ${name} — unavailable: ${reason}`}
                >
                  {t`Download`}
                </Button>

                {onRemoveAttachment !== undefined && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    startIcon={<IconX />}
                    onClick={() => onRemoveAttachment(attachment.id)}
                    aria-label={t`Remove ${name} from this message`}
                  >
                    {t`Remove`}
                  </Button>
                )}
              </StyledRow>
            );
          })}
        </StyledList>
      )}

      {removedNames.length > 0 && (
        <HermesMailboxNote role="status">
          {t`Removed from this message: ${removedNames.join(', ')}.`}
        </HermesMailboxNote>
      )}
    </StyledStrip>
  );
};
