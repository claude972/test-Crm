import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect, useId, useState } from 'react';
import { IconSend, IconTrash } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesWaByteSizeLabel } from '@/hermes-wa-ui/components/HermesWaByteSizeLabel';
import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { HermesWaVoicePlayer } from '@/hermes-wa-ui/components/HermesWaVoicePlayer';
import { HERMES_WA_DOCUMENTED_MEDIA_LIMITS } from '@/hermes-wa-ui/constants/HermesWaMediaLimits';
import { useHermesWaMediaKindLabel } from '@/hermes-wa-ui/hooks/useHermesWaMediaKindLabel';
import {
  HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  type HermesWaCapability,
} from '@/hermes-wa-ui/types/HermesWaCapability';
import {
  type HermesWaMediaLimits,
  judgeHermesWaMediaSelection,
} from '@/hermes-wa-ui/utils/judgeHermesWaMediaSelection';
import { readHermesWaMimeKind } from '@/hermes-wa-ui/utils/readHermesWaMimeKind';

const StyledPanel = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeading = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

// The browser's own control, kept visible rather than hidden behind a styled
// button: its keyboard behaviour is already right, and replacing it is how
// file pickers become unreachable.
const StyledFileInput = styled.input`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  max-inline-size: 100%;
  min-block-size: 40px;
  min-width: 0;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: 2px;
  }
`;

const StyledPreviewImage = styled.img`
  background: ${themeCssVariables.background.tertiary};
  block-size: auto;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: block;
  inline-size: 100%;
  max-inline-size: 280px;

  @media (max-width: 480px) {
    max-inline-size: 100%;
  }
`;

const StyledPreviewVideo = styled.video`
  background: ${themeCssVariables.background.tertiary};
  block-size: auto;
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: block;
  inline-size: 100%;
  max-inline-size: 280px;

  @media (max-width: 480px) {
    max-inline-size: 100%;
  }
`;

const StyledFacts = styled.dl`
  display: grid;
  gap: 2px ${themeCssVariables.spacing[2]};
  grid-template-columns: auto minmax(0, 1fr);
  margin: 0;
  min-width: 0;

  & > dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.xs};
  }

  & > dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.xs};
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 480px) {
    grid-template-columns: minmax(0, 1fr);

    & > dt {
      margin-block-start: ${themeCssVariables.spacing[1]};
    }
  }
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

type HermesWaMediaComposerProps = {
  // What the channel allows. A null field inside means that limit is unknown,
  // not that there is none. Defaults to the documented figures, which the
  // panel labels as documented rather than as verified.
  limits?: HermesWaMediaLimits;
  // Whether sending is open at all. The contract publishes it false until a
  // provider is configured, so it defaults to notConfigured.
  sendCapability?: HermesWaCapability;
  // The parent's send action. Absent means this screen has nowhere to send.
  onSubmitRequested?: (file: File) => void;
  onFileSelected?: (file: File | null) => void;
  onCancelled?: () => void;
};

// The panel that shows an attachment before anyone sends it: name, size,
// type, and a local preview from a blob: URL. Nothing is uploaded — there is
// no network call in this module — and the send button is the parent's.
//
// A file over the ceiling or outside the accepted types is refused here, in
// words, with both numbers. A limit the caller could not supply does NOT
// become "no limit": the verdict is undecidable, sending stays closed, and
// the panel names the missing limit.
export const HermesWaMediaComposer = ({
  limits = HERMES_WA_DOCUMENTED_MEDIA_LIMITS,
  sendCapability = HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  onSubmitRequested,
  onFileSelected,
  onCancelled,
}: HermesWaMediaComposerProps) => {
  const { t } = useLingui();

  const inputId = useId();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // One blob: URL per chosen file, revoked when the file changes or the panel
  // goes away. Without the cleanup every preview leaks for the tab's life.
  useEffect(() => {
    if (file === null) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const previewKind = readHermesWaMimeKind(file?.type);
  const previewKindLabel = useHermesWaMediaKindLabel(previewKind);

  const verdict =
    file === null
      ? null
      : judgeHermesWaMediaSelection(
          { name: file.name, byteSize: file.size, mimeType: file.type },
          limits,
        );

  const sendBlockedReason =
    sendCapability.kind === 'available'
      ? null
      : sendCapability.kind === 'notConfigured'
        ? t`No WhatsApp provider is configured for this workspace.`
        : isNonEmptyString(sendCapability.reason)
          ? sendCapability.reason
          : t`Sending is closed for this conversation.`;

  const changeFile = (next: File | null) => {
    setFile(next);
    onFileSelected?.(next);
  };

  const handleCancel = () => {
    changeFile(null);
    onCancelled?.();
  };

  const acceptAttribute =
    limits.acceptedMimeTypes === null || limits.acceptedMimeTypes.length === 0
      ? undefined
      : limits.acceptedMimeTypes.join(',');

  const maySubmit =
    verdict !== null &&
    verdict.kind === 'accepted' &&
    onSubmitRequested !== undefined &&
    sendBlockedReason === null;

  return (
    <StyledPanel aria-label={t`Attachment`}>
      <StyledHeading>{t`Attachment`}</StyledHeading>

      {sendBlockedReason !== null && (
        <HermesWaAlertNote role="alert">
          {t`Sending an attachment is unavailable.`} {sendBlockedReason}
        </HermesWaAlertNote>
      )}

      <StyledField>
        <StyledLabel htmlFor={inputId}>{t`Choose a file`}</StyledLabel>
        {/* A hint to the picker, never the gate: a person can always pick
            something else, and the verdict below decides. */}
        <StyledFileInput
          id={inputId}
          type="file"
          accept={acceptAttribute}
          onChange={(event) => {
            const [chosen] = Array.from(event.target.files ?? []);
            changeFile(chosen ?? null);
          }}
        />
      </StyledField>

      {/* The limits, said before a file is chosen rather than after it is
          refused. An unknown limit is named as unknown, and the server stays
          the authority over both. */}
      <HermesWaNote>
        {limits.maxByteSize === null ? (
          t`The size limit for this channel is not known.`
        ) : (
          <>
            {t`Up to`} <HermesWaByteSizeLabel byteSize={limits.maxByteSize} />
            {t` for images, more for video and audio. `}
          </>
        )}
        {limits.acceptedMimeTypes === null
          ? t`The accepted file types are not known either.`
          : limits.acceptedMimeTypes.length === 0
            ? t`No file type is accepted on this channel.`
            : t`Accepted types: ${limits.acceptedMimeTypes.join(', ')}.`}{' '}
        {t`The server checks again and can still refuse.`}
      </HermesWaNote>

      {file === null ? (
        <HermesWaNote>{t`No file chosen yet.`}</HermesWaNote>
      ) : (
        <>
          {/* The preview comes before the refusal: seeing which file was
              picked is how someone realises they picked the wrong one. */}
          {previewUrl !== null &&
            previewKind.kind === 'known' &&
            previewKind.mediaKind === 'IMAGE' && (
              <StyledPreviewImage src={previewUrl} alt={file.name} />
            )}

          {previewUrl !== null &&
            previewKind.kind === 'known' &&
            previewKind.mediaKind === 'VIDEO' && (
              <StyledPreviewVideo
                src={previewUrl}
                controls
                preload="metadata"
                playsInline
              />
            )}

          {previewUrl !== null &&
            previewKind.kind === 'known' &&
            previewKind.mediaKind === 'VOICE' && (
              <HermesWaVoicePlayer
                source={{ kind: 'resolved', objectUrl: previewUrl }}
                label={file.name}
              />
            )}

          {previewKind.kind === 'known' && previewKind.mediaKind === 'FILE' && (
            <HermesWaNote>{t`No preview for this kind of file.`}</HermesWaNote>
          )}

          <StyledFacts>
            <dt>{t`Name`}</dt>
            <dd>{file.name}</dd>

            <dt>{t`Size`}</dt>
            <dd>
              {file.size > 0 ? (
                <HermesWaByteSizeLabel byteSize={file.size} />
              ) : (
                t`Empty file`
              )}
            </dd>

            <dt>{t`Type`}</dt>
            <dd>
              {/* An absent MIME type is real for a file with no extension,
                  and it is why the verdict refuses it. */}
              {isNonEmptyString(file.type)
                ? file.type
                : t`Not reported by the browser`}
            </dd>

            {previewKindLabel !== null && (
              <>
                <dt>{t`Shown as`}</dt>
                <dd>{previewKindLabel}</dd>
              </>
            )}
          </StyledFacts>

          {verdict !== null && verdict.kind === 'refused' && (
            <HermesWaAlertNote role="alert">
              {verdict.reason === 'empty'
                ? t`This file is empty, so it cannot be sent.`
                : verdict.reason === 'unacceptedType'
                  ? t`This file type is not accepted on this channel.`
                  : t`This file is too large for this channel.`}
            </HermesWaAlertNote>
          )}

          {verdict !== null &&
            verdict.kind === 'refused' &&
            verdict.reason === 'tooLarge' && (
              <HermesWaNote>
                <HermesWaByteSizeLabel byteSize={verdict.byteSize} />
                {' · '}
                {t`limit`}{' '}
                <HermesWaByteSizeLabel byteSize={verdict.maxByteSize} />
              </HermesWaNote>
            )}

          {verdict !== null && verdict.kind === 'undecidable' && (
            <HermesWaAlertNote role="alert">
              {verdict.reason === 'maxByteSizeUnknown'
                ? t`This file cannot be offered for sending: the channel's size limit is unknown, so it cannot be checked.`
                : t`This file cannot be offered for sending: the channel's accepted file types are unknown, so they cannot be checked.`}
            </HermesWaAlertNote>
          )}
        </>
      )}

      <StyledActions>
        {onSubmitRequested !== undefined && (
          <Button
            type="button"
            variant="solid"
            size="sm"
            startIcon={<IconSend />}
            disabled={!maySubmit}
            onClick={() => {
              // Re-checked at the press: limits and capability are props and
              // can change under an open panel.
              if (file === null || !maySubmit) {
                return;
              }

              onSubmitRequested(file);
            }}
          >
            {t`Send this attachment`}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          startIcon={<IconTrash />}
          disabled={file === null}
          onClick={handleCancel}
        >
          {t`Cancel`}
        </Button>
      </StyledActions>

      {onSubmitRequested === undefined && (
        <HermesWaNote>
          {t`Sending is not available on this screen. The file stays in this browser.`}
        </HermesWaNote>
      )}
    </StyledPanel>
  );
};
