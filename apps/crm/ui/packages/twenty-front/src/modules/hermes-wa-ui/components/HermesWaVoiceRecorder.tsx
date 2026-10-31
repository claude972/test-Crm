import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import {
  IconMicrophone,
  IconPlayerStop,
  IconSend,
  IconTrash,
} from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { HermesWaVoicePlayer } from '@/hermes-wa-ui/components/HermesWaVoicePlayer';
import { useHermesWaVoiceRecorder } from '@/hermes-wa-ui/hooks/useHermesWaVoiceRecorder';
import {
  HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  type HermesWaCapability,
} from '@/hermes-wa-ui/types/HermesWaCapability';
import {
  type HermesWaRecordedClip,
  type HermesWaRecorderUnavailableReason,
} from '@/hermes-wa-ui/types/HermesWaRecorder';
import { formatHermesWaDuration } from '@/hermes-wa-ui/utils/formatHermesWaDuration';

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

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledLiveLine = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

// A dot, the word "Recording" and a running clock: three signals, so the
// state survives a monochrome screen and a muted one alike.
const StyledRecordingDot = styled.span`
  background: ${themeCssVariables.font.color.danger};
  block-size: 10px;
  border-radius: 50%;
  flex: none;
  inline-size: 10px;
`;

const StyledElapsed = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

type HermesWaVoiceRecorderProps = {
  // Whether voice recording is open for this workspace at all. The contract
  // publishes it false until a provider is configured, so it defaults to
  // notConfigured and the Record button stays closed with a reason.
  recordingCapability?: HermesWaCapability;
  // Whether a voice note can be sent, which is a separate question.
  sendCapability?: HermesWaCapability;
  // The parent's send action, a separate decision from stopping. Absent means
  // this screen has nowhere to send, and that is said in words.
  onSubmitRequested?: (clip: HermesWaRecordedClip) => void;
  // Notified as soon as a clip exists locally. Still not a send.
  onClipReady?: (clip: HermesWaRecordedClip) => void;
  onRecordingRequested?: () => void;
  onCancelled?: () => void;
  // A ceiling on the recording. Reaching it stops the capture, nothing else.
  maxDurationMs?: number | null;
};

// A voice recorder on the real MediaRecorder API, with two guarantees. The
// microphone opens on one explicit click of Record and nothing else — no
// effect starts a capture, so mounting or re-rendering raises no prompt. And
// stopping is not sending: Stop produces a clip and a preview, while the send
// button is the parent's, a separate press, and absent without a handler.
//
// There is deliberately no caption field: the provider's voice route accepts
// none, so offering one would promise a text that cannot travel.
export const HermesWaVoiceRecorder = ({
  recordingCapability = HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  sendCapability = HERMES_WA_NOT_CONFIGURED_CAPABILITY,
  onSubmitRequested,
  onClipReady,
  onRecordingRequested,
  onCancelled,
  maxDurationMs = null,
}: HermesWaVoiceRecorderProps) => {
  const { t, i18n } = useLingui();

  const {
    state,
    unsupportedReason,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useHermesWaVoiceRecorder({ onClipReady, maxDurationMs });

  const describeUnavailable = (
    reason: HermesWaRecorderUnavailableReason,
  ): string => {
    switch (reason) {
      case 'notSupported':
        return t`This browser cannot record audio.`;
      case 'insecureContext':
        return t`Recording needs a secure (HTTPS) connection.`;
      case 'permissionDenied':
        return t`Microphone access was refused. Allow it in the browser's site settings, then press Record again.`;
      case 'noMicrophone':
        return t`No microphone was found on this device.`;
      case 'microphoneBusy':
        return t`The microphone could not be opened. Another application may be using it.`;
      case 'unknown':
        // Deliberately not "denied": nobody refused anything as far as this
        // client knows.
        return t`The browser refused to start recording, without saying why.`;
    }
  };

  const describeCapability = (capability: HermesWaCapability): string | null =>
    capability.kind === 'available'
      ? null
      : capability.kind === 'notConfigured'
        ? t`No WhatsApp provider is configured for this workspace.`
        : isNonEmptyString(capability.reason)
          ? capability.reason
          : t`This is closed for this conversation.`;

  const recordingBlockedReason = describeCapability(recordingCapability);
  const sendBlockedReason = describeCapability(sendCapability);

  // Two independent gates, and both must open: the workspace's capability and
  // this browser's own.
  const isRecordingBlocked =
    recordingBlockedReason !== null || unsupportedReason !== null;

  const handleRecordingRequested = () => {
    onRecordingRequested?.();
    startRecording();
  };

  const handleCancel = () => {
    cancelRecording();
    onCancelled?.();
  };

  const elapsedMs =
    state.kind === 'recording' || state.kind === 'stopping'
      ? state.elapsedMs
      : 0;

  const elapsedLabel = formatHermesWaDuration(elapsedMs) ?? '0:00';

  // The live region is fed whole seconds, not the 250 ms ticks: a status
  // region changing four times a second is unusable with a screen reader.
  const elapsedSeconds = i18n.number(Math.floor(elapsedMs / 1000));

  return (
    <StyledPanel aria-label={t`Voice message`}>
      <StyledHeading>{t`Voice message`}</StyledHeading>

      {recordingBlockedReason !== null && (
        <HermesWaAlertNote role="alert">
          {t`Voice recording is unavailable.`} {recordingBlockedReason}
        </HermesWaAlertNote>
      )}

      {/* Read without touching the device, so the panel can say up front that
          recording is impossible rather than offering a dead click. */}
      {unsupportedReason !== null && (
        <HermesWaAlertNote role="alert">
          {describeUnavailable(unsupportedReason)}
        </HermesWaAlertNote>
      )}

      {state.kind === 'idle' && (
        <>
          <StyledActions>
            <Button
              type="button"
              variant="solid"
              size="sm"
              startIcon={<IconMicrophone />}
              disabled={isRecordingBlocked}
              onClick={handleRecordingRequested}
            >
              {t`Record`}
            </Button>
          </StyledActions>
          <HermesWaNote>
            {t`The microphone opens only when you press Record.`}
          </HermesWaNote>
        </>
      )}

      {state.kind === 'requestingPermission' && (
        <HermesWaNote role="status">
          {t`Waiting for microphone permission…`}
        </HermesWaNote>
      )}

      {(state.kind === 'unavailable' || state.kind === 'failed') && (
        <>
          {state.kind === 'failed' && (
            <HermesWaAlertNote role="alert">
              {t`Recording stopped because of an error. Nothing was kept.`}
            </HermesWaAlertNote>
          )}
          <HermesWaAlertNote
            role={state.kind === 'failed' ? undefined : 'alert'}
          >
            {describeUnavailable(state.reason)}
          </HermesWaAlertNote>
          <StyledActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<IconMicrophone />}
              disabled={isRecordingBlocked}
              onClick={handleRecordingRequested}
            >
              {t`Try again`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              {t`Close`}
            </Button>
          </StyledActions>
        </>
      )}

      {(state.kind === 'recording' || state.kind === 'stopping') && (
        <>
          <StyledLiveLine>
            {state.kind === 'recording' && <StyledRecordingDot />}
            <StyledElapsed>{elapsedLabel}</StyledElapsed>
            <HermesWaNote>
              {state.kind === 'recording' ? t`Recording` : t`Finishing…`}
            </HermesWaNote>
          </StyledLiveLine>

          <HermesWaNote role="status">
            {state.kind === 'recording'
              ? t`Recording, ${elapsedSeconds} seconds.`
              : t`Recording finished, ${elapsedSeconds} seconds. Nothing has been sent.`}
          </HermesWaNote>

          <StyledActions>
            <Button
              type="button"
              variant="solid"
              size="sm"
              startIcon={<IconPlayerStop />}
              disabled={state.kind === 'stopping'}
              onClick={stopRecording}
            >
              {t`Stop`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              startIcon={<IconTrash />}
              onClick={handleCancel}
            >
              {t`Cancel`}
            </Button>
          </StyledActions>

          <HermesWaNote>
            {t`Stopping does not send anything: you listen back first.`}
          </HermesWaNote>
        </>
      )}

      {state.kind === 'review' && (
        <>
          <HermesWaNote role="status">
            {t`Recording ready. Nothing has been sent.`}
          </HermesWaNote>

          <HermesWaVoicePlayer
            source={{ kind: 'resolved', objectUrl: state.clip.previewUrl }}
            durationMs={state.clip.durationMs}
            label={t`you just recorded`}
          />

          <StyledActions>
            {onSubmitRequested !== undefined && (
              <Button
                type="button"
                variant="solid"
                size="sm"
                startIcon={<IconSend />}
                disabled={sendBlockedReason !== null}
                onClick={() => onSubmitRequested(state.clip)}
              >
                {t`Send this voice message`}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              startIcon={<IconMicrophone />}
              disabled={isRecordingBlocked}
              onClick={handleRecordingRequested}
            >
              {t`Record again`}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              startIcon={<IconTrash />}
              onClick={handleCancel}
            >
              {t`Discard`}
            </Button>
          </StyledActions>

          {/* The recording is real and it is here; claiming it could be sent
              would be the lie. */}
          {onSubmitRequested === undefined ? (
            <HermesWaNote>
              {t`Sending is not available on this screen. The recording stays in this browser.`}
            </HermesWaNote>
          ) : (
            sendBlockedReason !== null && (
              <HermesWaAlertNote role="alert">
                {t`Sending is unavailable.`} {sendBlockedReason}
              </HermesWaAlertNote>
            )
          )}

          <HermesWaNote>
            {t`Discarding deletes the recording and releases the microphone resources.`}
          </HermesWaNote>
        </>
      )}
    </StyledPanel>
  );
};
