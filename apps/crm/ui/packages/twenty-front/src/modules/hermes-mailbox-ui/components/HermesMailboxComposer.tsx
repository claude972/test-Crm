import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useCallback, useMemo, useState } from 'react';
import { IconDeviceFloppy, IconSend, IconX } from 'kovaa-lab-ui/icon';
import { Button, Field, Input, Textarea } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxAttachmentStrip } from '@/hermes-mailbox-ui/components/HermesMailboxAttachmentStrip';
import { HermesMailboxDiagnostic } from '@/hermes-mailbox-ui/components/HermesMailboxDiagnostic';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendAvailability,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import {
  formatHermesMailboxAddress,
  isHermesMailboxAddressUsable,
  splitHermesMailboxAddressList,
} from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';

const StyledEditor = styled.form`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledEditorHeader = styled.div`
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

const StyledEditorTitle = styled.h3`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledStates = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
  min-width: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledSenderRow = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[0.5]};
  min-width: 0;
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledSenderAddress = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow-wrap: anywhere;
`;

type HermesMailboxComposerProps = {
  // The authority on recipients: the server planned it from the original
  // message. The editor shows it, lets a person change it afterwards, and
  // never substitutes a computation of its own.
  envelope: HermesMailboxEnvelope;
  sendAvailability: HermesMailboxSendAvailability;
  sendState: HermesMailboxSendState;
  draftSaveState: HermesMailboxDraftSaveState;
  // Intentions, not actions. This module emits nothing and reaches no server.
  onRequestSend: (composition: HermesMailboxComposition) => void;
  onSaveDraft: (composition: HermesMailboxComposition) => void;
  onDiscard: () => void;
};

// The editor for Reply, Reply all and Forward.
//
// Saving and sending are asymmetric on purpose. Saving is always offered and
// fully truthful, because it emits nothing. Sending appears only on a
// confirmed capability, and asks for an emission rather than promising one.
export const HermesMailboxComposer = ({
  envelope,
  sendAvailability,
  sendState,
  draftSaveState,
  onRequestSend,
  onSaveDraft,
  onDiscard,
}: HermesMailboxComposerProps) => {
  const { t } = useLingui();

  const plannedTo = useMemo(
    () => envelope.to.map((address) => address.email ?? address.raw),
    [envelope.to],
  );
  const plannedCc = useMemo(
    () => envelope.cc.map((address) => address.email ?? address.raw),
    [envelope.cc],
  );

  const [toText, setToText] = useState(plannedTo.join(', '));
  const [ccText, setCcText] = useState(plannedCc.join(', '));
  const [subject, setSubject] = useState(envelope.subject);
  const [body, setBody] = useState(envelope.body);
  const [attachments, setAttachments] = useState(envelope.attachments);
  const [removedNames, setRemovedNames] = useState<string[]>([]);

  const to = useMemo(() => splitHermesMailboxAddressList(toText), [toText]);
  const cc = useMemo(() => splitHermesMailboxAddressList(ccText), [ccText]);

  // Said out loud rather than left to be noticed: once a field is edited, the
  // server's prepared value is no longer what will be sent.
  const isEnvelopeEdited =
    toText !== plannedTo.join(', ') ||
    ccText !== plannedCc.join(', ') ||
    subject !== envelope.subject;

  const unusableEntries = useMemo(
    () => [...to, ...cc].filter((entry) => !isHermesMailboxAddressUsable(entry)),
    [to, cc],
  );

  const composition: HermesMailboxComposition = useMemo(
    () => ({
      kind: envelope.kind,
      threadId: envelope.threadId,
      to,
      cc,
      subject,
      body,
      attachments,
      envelope,
    }),
    [envelope, to, cc, subject, body, attachments],
  );

  const removeAttachment = useCallback(
    (attachmentId: string) => {
      setAttachments((current) => {
        const removed = current.find((entry) => entry.id === attachmentId);

        if (removed !== undefined) {
          setRemovedNames((names) => [
            ...names,
            removed.name ?? t`Unnamed file`,
          ]);
        }

        return current.filter((entry) => entry.id !== attachmentId);
      });
    },
    [t],
  );

  const titles: Record<HermesMailboxComposeKind, string> = {
    reply: t`Reply`,
    replyAll: t`Reply to all`,
    forward: t`Forward`,
  };

  const isSendRequestInFlight = sendState.kind === 'requested';
  const isSenderRefused = envelope.sender.authority.kind === 'refused';
  const hasRecipients = to.length > 0 || cc.length > 0;

  const isSendable =
    hasRecipients &&
    unusableEntries.length === 0 &&
    !isSenderRefused &&
    !isSendRequestInFlight;

  const describeSenderAuthority = (): string => {
    const { authority } = envelope.sender;

    if (authority.kind === 'mailbox') {
      return t`This mailbox's own address.`;
    }

    if (authority.kind === 'authorizedAlias') {
      return t`An alias this workspace authorised for this mailbox.`;
    }

    if (authority.reason === 'sameDomain') {
      return t`Refused: sharing a domain with the mailbox grants no authority to send as this address.`;
    }

    if (authority.reason === 'notAuthorized') {
      return t`Refused: this address is not an authorised alias of the mailbox.`;
    }

    return t`Refused: this address could not be checked against the mailbox.`;
  };

  // In this slice a saved draft keeps no attachment, so the save hands over a
  // composition without them and says so before anybody presses it.
  const saveComposition: HermesMailboxComposition = {
    ...composition,
    attachments: [],
  };

  return (
    <StyledEditor
      aria-label={titles[envelope.kind]}
      onSubmit={(event) => {
        event.preventDefault();

        // Guarded here as well as on the button: a disabled button is a
        // presentation, and Enter in a text field submits a form.
        if (sendAvailability !== true || !isSendable) {
          return;
        }

        onRequestSend(composition);
      }}
    >
      <StyledEditorHeader>
        <StyledEditorTitle>{titles[envelope.kind]}</StyledEditorTitle>
        <HermesMailboxNote>
          <Trans>Nothing is sent until you ask for it.</Trans>
        </HermesMailboxNote>
      </StyledEditorHeader>

      <StyledSenderRow>
        <StyledSenderAddress>
          {t`From`}: {formatHermesMailboxAddress(envelope.sender.address)}
        </StyledSenderAddress>
        <HermesMailboxNote role={isSenderRefused ? 'alert' : undefined}>
          {describeSenderAuthority()}
        </HermesMailboxNote>
      </StyledSenderRow>

      <HermesMailboxNote>
        {envelope.kind === 'forward' ? (
          <Trans>
            Recipients were prepared by the server. A forward leaves with no
            reply references and no recipient: you choose where it goes.
          </Trans>
        ) : (
          <Trans>
            Recipients were prepared by the server from the original message.
            You can change them below.
          </Trans>
        )}
      </HermesMailboxNote>

      {/* One control per Field.Root: Field injects its own aria-labelledby on
          every control it wraps, which would rename a second one. */}
      <Field.Root render={<StyledField />}>
        <Field.Label>{t`To`}</Field.Label>
        <Input
          value={toText}
          onChange={(event) => setToText(event.target.value)}
          disabled={isSendRequestInFlight}
          autoComplete="off"
        />
        <Field.Description>{t`Separate addresses with commas.`}</Field.Description>
      </Field.Root>

      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Cc`}</Field.Label>
        <Input
          value={ccText}
          onChange={(event) => setCcText(event.target.value)}
          disabled={isSendRequestInFlight}
          autoComplete="off"
        />
        <Field.Description>{t`Separate addresses with commas.`}</Field.Description>
      </Field.Root>

      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Subject`}</Field.Label>
        <Input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={isSendRequestInFlight}
        />
      </Field.Root>

      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Message`}</Field.Label>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={isSendRequestInFlight}
          rows={6}
          placeholder={t`Write your message.`}
        />
      </Field.Root>

      <HermesMailboxAttachmentStrip
        title={t`Forwarded attachments`}
        attachments={attachments}
        onRemoveAttachment={removeAttachment}
        removedNames={removedNames}
      />

      <StyledStates>
        {isEnvelopeEdited && (
          <HermesMailboxNote role="status">
            <Trans>
              You changed what the server prepared. Your values are what will
              be sent.
            </Trans>
          </HermesMailboxNote>
        )}

        {!hasRecipients && (
          <HermesMailboxNote>
            <Trans>Add at least one recipient before asking to send.</Trans>
          </HermesMailboxNote>
        )}

        {unusableEntries.length > 0 && (
          <HermesMailboxNote role="alert">
            {t`These entries are not usable addresses: ${unusableEntries.join(', ')}.`}
          </HermesMailboxNote>
        )}

        {body.trim().length === 0 && (
          <HermesMailboxNote>
            <Trans>This message has no text yet.</Trans>
          </HermesMailboxNote>
        )}

        {attachments.length > 0 && (
          <HermesMailboxNote>
            <Trans>
              Saving as a draft does not keep attachments in this version.
            </Trans>
          </HermesMailboxNote>
        )}
      </StyledStates>

      <StyledStates>
        {draftSaveState.kind === 'saving' && (
          <HermesMailboxNote role="status">
            <Trans>Saving the draft…</Trans>
          </HermesMailboxNote>
        )}

        {draftSaveState.kind === 'saved' && (
          <HermesMailboxNote role="status">
            <Trans>
              Saved as a draft. Nothing was sent, and nobody was notified.
            </Trans>
          </HermesMailboxNote>
        )}

        {draftSaveState.kind === 'failed' && (
          <>
            <HermesMailboxNote role="alert">
              <Trans>The draft was not saved.</Trans>
            </HermesMailboxNote>
            <HermesMailboxDiagnostic message={draftSaveState.message} />
          </>
        )}

        {draftSaveState.kind === 'notConfigured' && (
          <HermesMailboxNote role="alert">
            <Trans>Saving drafts is not set up on this mailbox.</Trans>
          </HermesMailboxNote>
        )}
      </StyledStates>

      <StyledStates>
        {sendState.kind === 'requested' && (
          <HermesMailboxNote role="status">
            <Trans>Send requested. No confirmation yet.</Trans>
          </HermesMailboxNote>
        )}

        {sendState.kind === 'accepted' && (
          <HermesMailboxNote role="status">
            <Trans>
              The server took the message. Accepted is not delivered.
            </Trans>
          </HermesMailboxNote>
        )}

        {sendState.kind === 'failed' && (
          <>
            <HermesMailboxNote role="alert">
              <Trans>The send request failed.</Trans>
            </HermesMailboxNote>
            <HermesMailboxDiagnostic message={sendState.message} />
          </>
        )}

        {sendState.kind === 'notConfigured' && (
          <HermesMailboxNote role="alert">
            <Trans>Sending is not set up on this mailbox.</Trans>
          </HermesMailboxNote>
        )}
      </StyledStates>

      <StyledActions>
        <Button
          type="button"
          variant="solid"
          size="sm"
          startIcon={<IconDeviceFloppy />}
          loading={draftSaveState.kind === 'saving'}
          disabled={
            draftSaveState.kind === 'saving' ||
            draftSaveState.kind === 'notConfigured'
          }
          onClick={() => onSaveDraft(saveComposition)}
        >
          {t`Save as draft`}
        </Button>

        {/* Present only on a confirmed capability: a button that might do
            nothing is the fake control this product refuses. */}
        {sendAvailability === true && (
          <Button
            type="submit"
            variant="outline"
            size="sm"
            startIcon={<IconSend />}
            loading={isSendRequestInFlight}
            disabled={!isSendable}
          >
            {t`Request send`}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          startIcon={<IconX />}
          onClick={onDiscard}
        >
          {t`Close without saving`}
        </Button>
      </StyledActions>

      {sendAvailability === false && (
        <HermesMailboxNote>
          <Trans>
            This mailbox cannot send. You can still save what you wrote as a
            draft.
          </Trans>
        </HermesMailboxNote>
      )}

      {sendAvailability === null && (
        <HermesMailboxNote>
          <Trans>
            Whether this mailbox can send is unknown, so no send control is
            offered. Saving a draft still works.
          </Trans>
        </HermesMailboxNote>
      )}
    </StyledEditor>
  );
};
