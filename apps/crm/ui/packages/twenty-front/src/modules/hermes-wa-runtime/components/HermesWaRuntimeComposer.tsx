import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { IconSend } from 'kovaa-lab-ui/icon';
import { Button, Field, Textarea } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import {
  MESSAGING_INBOX_REPLY_MAX_LENGTH,
  MESSAGING_INBOX_REPLY_MIN_LENGTH,
} from '@/messaging-inbox/constants/MessagingInboxContract';
import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';

import { HermesWaMediaComposer } from '@/hermes-wa-ui/components/HermesWaMediaComposer';
import {
  HermesWaAlertNote,
  HermesWaNote,
} from '@/hermes-wa-ui/components/HermesWaNote';
import { HermesWaVoiceRecorder } from '@/hermes-wa-ui/components/HermesWaVoiceRecorder';
import { HERMES_WA_DOCUMENTED_MEDIA_LIMITS } from '@/hermes-wa-ui/constants/HermesWaMediaLimits';
import { type HermesWaRecordedClip } from '@/hermes-wa-ui/types/HermesWaRecorder';

import { useHermesWaMediaUpload } from '@/hermes-wa-runtime/hooks/useHermesWaMediaUpload';
import { type HermesWaReply } from '@/hermes-wa-runtime/hooks/useHermesWaReply';
import { toHermesWaCapability } from '@/hermes-wa-runtime/utils/toHermesWaCapability';

const StyledComposer = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSection = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

type HermesWaRuntimeComposerProps = {
  conversationId: string;
  connectionRead: MessagingInboxConnectionRead;
  reply: HermesWaReply;
};

// The human reply, in its three shapes: text, a file, a voice note.
//
// Every control here is wired to a person. There is no effect in this file and
// nothing in it runs at mount: not the prepare, not the upload, not the send.
//
// Capabilities are read from the connection, one flag at a time, and an absent
// flag closes the control with a sentence. The server derives canSendMedia and
// canRecordVoice from the provider's own answers — the pinned build on an open
// socket — so these panels open on a real instance and stay closed, with a
// sentence, on one that is unconfigured, on another version, or disconnected.
// A closed panel is the honest picture of that provider, not a bug here.
//
// A true canRecordVoice means the verified build publishes the voice route. It
// is not proof that a voice note was converted and delivered: nothing the
// provider exposes reports host-side audio conversion, so the first real send
// remains the thing that settles it.
export const HermesWaRuntimeComposer = ({
  conversationId,
  connectionRead,
  reply,
}: HermesWaRuntimeComposerProps) => {
  const { t, i18n } = useLingui();

  const [text, setText] = useState('');
  const upload = useHermesWaMediaUpload();

  const sendCapability = toHermesWaCapability(connectionRead, 'canSend');
  const mediaCapability = toHermesWaCapability(connectionRead, 'canSendMedia');
  const voiceCapability = toHermesWaCapability(
    connectionRead,
    'canRecordVoice',
  );

  const isSending = reply.state.kind === 'requested';
  const trimmedLength = text.trim().length;
  const isTooLong = text.length > MESSAGING_INBOX_REPLY_MAX_LENGTH;
  const canSendText =
    sendCapability.kind === 'available' &&
    !isSending &&
    trimmedLength >= MESSAGING_INBOX_REPLY_MIN_LENGTH &&
    !isTooLong;

  const sendText = useCallback(() => {
    // Captured here, before the attempt leaves. The composer may be cleared
    // and the thread may change; this attempt carries the body and the thread
    // it was built from.
    const capturedConversationId = conversationId;
    const capturedText = text;

    reply.send({
      kind: 'TEXT',
      conversationId: capturedConversationId,
      text: capturedText,
    });
  }, [conversationId, reply, text]);

  // WHAT THE OPERATOR IS LOOKING AT, and WHAT WAS UPLOADED — held as the two
  // source objects themselves, not as flags derived from them.
  //
  // The bug this closes: the upload hook's own lock made the hook internally
  // consistent, but nothing tied the panel's displayed file to the asset Send
  // transmitted. Pick A, upload it, pick B while A is in flight, and the panel
  // showed B while Send carried A's asset id — the wrong bytes to a real
  // customer under a selection the operator believed.
  //
  // So the identity is carried rather than the trust re-derived. These are the
  // very objects the panels hand over, compared by reference.
  const [displayedSource, setDisplayedSource] = useState<Blob | null>(null);
  const [uploadedSource, setUploadedSource] = useState<Blob | null>(null);

  // Every change of selection, including a clear. The upload is deliberately
  // NOT reset here: an asset the server already prepared stays cancellable by
  // a person, which is the only durable revocation there is. What changes is
  // that Send is withdrawn below, because the identities no longer agree.
  const handleFileSelected = useCallback((file: File | null) => {
    setDisplayedSource(file);
  }, []);

  const handleClipReady = useCallback((clip: HermesWaRecordedClip) => {
    setDisplayedSource(clip.blob);
  }, []);

  const handleClipCancelled = useCallback(() => {
    setDisplayedSource(null);
  }, []);

  // A file the operator chose. The library already refused anything the
  // documented limits rule out before this is reached; the upload hook checks
  // again, because the verdict and the request belong together.
  const submitFile = useCallback(
    (file: File) => {
      setDisplayedSource(file);
      if (upload.upload(conversationId, file, file.name)) {
        setUploadedSource(file);
      }
    },
    [conversationId, upload],
  );

  // A clip that exists in this browser and nowhere else. It becomes an upload
  // only here, on the operator's own submit — `onClipReady` is deliberately
  // not wired to anything that sends.
  const submitClip = useCallback(
    (clip: HermesWaRecordedClip) => {
      // A recorder reports `audio/webm;codecs=opus`; the upload hook strips
      // the parameters before prepare. The filename is this client's, since a
      // recording has none, and it carries no caption: a voice note has no
      // caption to carry.
      setDisplayedSource(clip.blob);
      if (upload.upload(conversationId, clip.blob, 'voice-note')) {
        setUploadedSource(clip.blob);
      }
    },
    [conversationId, upload],
  );

  // The asset a send may reference. Only a READY one exists here.
  //
  // The reply kind is the kind the server VALIDATED at finalize. An Opus
  // recording whose native sniff said `video/webm` is AUDIO on the server:
  // reading the MIME instead would send it as a video, the server refuses
  // that, and the voice note never arrives.
  const uploadedAsset = upload.state.kind === 'ready' ? upload.state : null;

  // The one gate. A ready asset is sendable only while the thing on screen is
  // the thing it was built from, so "displayed B, sendable A" is not a state
  // this component can be in.
  const isAssetForDisplayedSource =
    uploadedAsset !== null &&
    uploadedSource !== null &&
    uploadedSource === displayedSource;

  const readyAsset = isAssetForDisplayedSource ? uploadedAsset : null;

  const sendAsset = useCallback(() => {
    if (readyAsset === null) {
      return;
    }

    const capturedConversationId = conversationId;
    const capturedAssetId = readyAsset.assetId;
    const mimeType = readyAsset.mimeType.toLowerCase();

    if (readyAsset.assetKind === 'AUDIO') {
      // No caption, as the contract requires.
      reply.send({
        kind: 'AUDIO',
        conversationId: capturedConversationId,
        assetId: capturedAssetId,
      });

      return;
    }

    if (readyAsset.assetKind === 'IMAGE') {
      reply.send({
        kind: 'IMAGE',
        conversationId: capturedConversationId,
        text,
        assetId: capturedAssetId,
      });

      return;
    }

    if (readyAsset.assetKind === 'VIDEO') {
      reply.send({
        kind: 'VIDEO',
        conversationId: capturedConversationId,
        text,
        assetId: capturedAssetId,
      });

      return;
    }

    // Past here the server named no sendable kind, so its MIME is all that is
    // left to read. A fallback, never the first answer.

    if (mimeType.startsWith('audio/')) {
      // No caption, as the contract requires.
      reply.send({
        kind: 'AUDIO',
        conversationId: capturedConversationId,
        assetId: capturedAssetId,
      });

      return;
    }

    if (mimeType.startsWith('image/')) {
      reply.send({
        kind: 'IMAGE',
        conversationId: capturedConversationId,
        text,
        assetId: capturedAssetId,
      });

      return;
    }

    if (mimeType.startsWith('video/')) {
      reply.send({
        kind: 'VIDEO',
        conversationId: capturedConversationId,
        text,
        assetId: capturedAssetId,
      });

      return;
    }

    // No validated kind and a MIME outside the three: nothing is sent. The
    // video/webm recording that used to land here is now caught above by the
    // server's own AUDIO verdict, which is the whole point of reading it.
  }, [conversationId, readyAsset, reply, text]);

  return (
    <StyledComposer>
      {sendCapability.kind === 'notConfigured' && (
        <HermesWaNote>
          <Trans>
            No WhatsApp connection is configured, so nothing can be sent from
            here.
          </Trans>
        </HermesWaNote>
      )}

      {sendCapability.kind === 'unavailable' && (
        <HermesWaNote>
          <Trans>Sending is not available on this connection right now.</Trans>
        </HermesWaNote>
      )}

      <Field.Root>
        <Field.Label>{t`Reply`}</Field.Label>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isSending}
          rows={3}
          placeholder={t`Write a reply.`}
        />
        <Field.Description>
          {t`${i18n.number(text.length)} of ${i18n.number(MESSAGING_INBOX_REPLY_MAX_LENGTH)} characters.`}
        </Field.Description>
      </Field.Root>

      {isTooLong && (
        <HermesWaAlertNote role="alert">
          {t`This reply is longer than the contract allows.`}
        </HermesWaAlertNote>
      )}

      <StyledActions>
        <Button
          variant="solid"
          color="accent"
          size="sm"
          startIcon={<IconSend />}
          loading={isSending}
          disabled={!canSendText}
          onClick={sendText}
        >
          {t`Send`}
        </Button>

        {reply.state.kind === 'accepted' && (
          <HermesWaNote>
            {/* Provider acceptance. Never a delivery and never a read. */}
            <Trans>Accepted by the provider. Delivery is not confirmed.</Trans>
          </HermesWaNote>
        )}

        {reply.state.kind === 'failed' && (
          <HermesWaAlertNote role="alert">
            {reply.state.failure.kind === 'denied'
              ? t`Sending was refused.`
              : t`The server refused this reply.`}
          </HermesWaAlertNote>
        )}
      </StyledActions>

      {reply.state.kind === 'unconfirmed' && (
        <StyledSection>
          <HermesWaAlertNote role="alert">
            <Trans>
              This reply left and the outcome is unknown. It is not a failure
              and it is not a send.
            </Trans>
          </HermesWaAlertNote>
          <HermesWaNote>
            <Trans>
              Nothing is retried automatically. Asking again reuses the same
              request identifier, so the server returns the original result
              instead of sending a second message.
            </Trans>
          </HermesWaNote>
          {reply.askOutcomeAgain !== null && (
            <StyledActions>
              <Button
                variant="outline"
                size="sm"
                onClick={reply.askOutcomeAgain}
              >
                {t`Ask the server for this reply's outcome`}
              </Button>
              <Button variant="outline" size="sm" onClick={reply.resetToDraft}>
                {t`Start a new reply`}
              </Button>
            </StyledActions>
          )}
        </StyledSection>
      )}

      <StyledSection>
        <HermesWaMediaComposer
          limits={HERMES_WA_DOCUMENTED_MEDIA_LIMITS}
          sendCapability={mediaCapability}
          onSubmitRequested={submitFile}
          // Every change of selection is reported, so the identity gate above
          // knows what the panel is actually showing.
          onFileSelected={handleFileSelected}
        />
      </StyledSection>

      <StyledSection>
        <HermesWaVoiceRecorder
          recordingCapability={voiceCapability}
          sendCapability={mediaCapability}
          onSubmitRequested={submitClip}
          onClipReady={handleClipReady}
          onRecordingRequested={handleClipCancelled}
          onCancelled={handleClipCancelled}
        />
      </StyledSection>

      {upload.state.kind === 'refusedLocally' && (
        <HermesWaAlertNote role="alert">
          {upload.state.reason === 'tooLarge'
            ? t`This file is larger than the documented limit.`
            : upload.state.reason === 'empty'
              ? t`This file is empty.`
              : upload.state.reason === 'unacceptedType'
                ? t`This file type is not accepted on WhatsApp.`
                : t`The limits for this file are unknown here, so it was not offered for sending.`}
        </HermesWaAlertNote>
      )}

      {(upload.state.kind === 'preparing' ||
        upload.state.kind === 'uploading' ||
        upload.state.kind === 'finalizing') && (
        <HermesWaNote>
          {upload.state.kind === 'preparing'
            ? t`Preparing the upload. Nothing has been sent.`
            : upload.state.kind === 'uploading'
              ? t`Uploading the file to the workspace. Nothing has been sent.`
              : t`Checking the uploaded file. Nothing has been sent.`}
        </HermesWaNote>
      )}

      {upload.state.kind === 'denied' && (
        <HermesWaAlertNote role="alert">
          {t`This attachment was refused.`}
        </HermesWaAlertNote>
      )}

      {upload.state.kind === 'failed' && (
        <StyledSection>
          <HermesWaAlertNote role="alert">
            {t`The attachment did not get through.`}
          </HermesWaAlertNote>
          {upload.cancel !== null && (
            <Button variant="outline" size="sm" onClick={upload.cancel}>
              {t`Discard the draft attachment`}
            </Button>
          )}
        </StyledSection>
      )}

      {/* The section follows the asset the server prepared, so it can still be
          discarded. The SEND button follows the identity gate, so it exists
          only while the prepared asset is the thing on screen. */}
      {uploadedAsset !== null && (
        <StyledSection>
          <HermesWaNote>
            <Trans>
              The attachment is ready in the workspace and has not been sent.
            </Trans>
          </HermesWaNote>

          {!isAssetForDisplayedSource && (
            <HermesWaAlertNote role="alert">
              {/* Said rather than silently disabled: the operator chose
                  something else after this one was prepared, so sending it now
                  would send bytes they are no longer looking at. */}
              {t`This prepared attachment is not the file now selected, so it cannot be sent. Press "Send this attachment" to upload the selected file, or discard this one.`}
            </HermesWaAlertNote>
          )}

          <StyledActions>
            {readyAsset !== null && (
              <Button
                variant="solid"
                color="accent"
                size="sm"
                startIcon={<IconSend />}
                disabled={sendCapability.kind !== 'available' || isSending}
                onClick={sendAsset}
              >
                {t`Send the attachment`}
              </Button>
            )}
            {upload.cancel !== null && (
              <Button variant="outline" size="sm" onClick={upload.cancel}>
                {t`Discard the draft attachment`}
              </Button>
            )}
          </StyledActions>
        </StyledSection>
      )}

      {upload.state.kind === 'cancelled' && (
        <HermesWaNote>{t`The draft attachment was discarded.`}</HermesWaNote>
      )}
    </StyledComposer>
  );
};
