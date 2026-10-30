import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconRobot, IconSend } from 'kovaa-lab-ui/icon';
import { Button, Field, Textarea } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { MessagingInboxDiagnostic } from '@/messaging-inbox/components/MessagingInboxDiagnostic';
import { MessagingInboxMessageStatus } from '@/messaging-inbox/components/MessagingInboxMessageStatus';
import { MessagingInboxNote } from '@/messaging-inbox/components/MessagingInboxNote';
import {
  MESSAGING_INBOX_REPLY_MAX_LENGTH,
  MESSAGING_INBOX_REPLY_MIN_LENGTH,
} from '@/messaging-inbox/constants/MessagingInboxContract';
import { useMessagingInboxBotPolicy } from '@/messaging-inbox/hooks/useMessagingInboxBotPolicy';
import { useMessagingInboxDraftReply } from '@/messaging-inbox/hooks/useMessagingInboxDraftReply';
import { useMessagingInboxReply } from '@/messaging-inbox/hooks/useMessagingInboxReply';

const StyledForm = styled.form`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledField = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSendState = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  justify-items: start;
`;

const StyledProposal = styled.p`
  margin: ${themeCssVariables.spacing[2]} 0;
  white-space: pre-wrap;
`;

type MessagingInboxComposerProps = {
  conversationId: string;
  // The message a draft would answer. The contract requires one, and the
  // thread is ordered newest first, so this is its first item. Null means
  // there is nothing to draft against and no draft button is rendered.
  latestMessageId: string | null;
  // Called once the server has accepted an attempt, so the thread reloads
  // from the server instead of the screen inserting a message it invented.
  onAccepted: () => void;
};

// The reply composer.
//
// The three send states stay apart on screen and in the model:
//   draft     — proposed locally, nothing has left the browser;
//   requested — the mutation is in flight, no transport has acknowledged it;
//   accepted  — the server answered, and that answer's own status is shown
//               verbatim beneath. ACCEPTED there is a provider receipt and
//               never a delivery.
//
// A failed or unreadable attempt keeps its idempotency key, so "Retry" replays
// the same send rather than risking a second message to the customer. An
// unreadable answer is not a failure: the contract keeps an unknown outcome
// UNCONFIRMED.
//
// The draft button asks hermesInboxDraftReply for text and drops it in this
// textarea as an ordinary local draft. A person then presses Send. Nothing
// here sends a draft on its own — the contract requires a separate explicit
// human reply call, and there is no code path that chains the two.
export const MessagingInboxComposer = ({
  conversationId,
  latestMessageId,
  onAccepted,
}: MessagingInboxComposerProps) => {
  const { t, i18n } = useLingui();

  const [text, setText] = useState('');

  const { state, sendReply, retrySend, resetToDraft } =
    useMessagingInboxReply();

  const {
    state: draftState,
    requestDraft,
    dismissDraft,
  } = useMessagingInboxDraftReply();

  // Drafting follows the server's policy. An unreadable policy is not a
  // permission: the button is closed rather than opened on a guess.
  const policy = useMessagingInboxBotPolicy(conversationId);

  const mayDraft =
    policy.read.kind === 'reported' &&
    policy.read.policy.effectiveMode !== 'OFF' &&
    policy.read.policy.canDraft;

  const onAcceptedRef = useRef(onAccepted);

  useEffect(() => {
    onAcceptedRef.current = onAccepted;
  }, [onAccepted]);

  // Keyed on the accepted attempt's own id, so the thread reloads once per
  // accepted send and not on every re-render that follows it.
  const acceptedRequestId =
    state.kind === 'accepted' ? state.clientRequestId : null;

  useEffect(() => {
    if (acceptedRequestId === null) {
      return;
    }

    onAcceptedRef.current();
  }, [acceptedRequestId]);

  // A proposal fills the textarea exactly once, and only when the bot really
  // proposed one. It lands as a local draft: the send state is untouched.
  // A proposal that arrives after the bot was stopped is not offered. The
  // answer may have left before the change; showing it would reopen a door
  // the policy has closed.
  const proposedText =
    mayDraft &&
    draftState.kind === 'read' &&
    draftState.draft.mode === 'DRAFT' &&
    draftState.draft.status === 'READY' &&
    isNonEmptyString(draftState.draft.text)
      ? draftState.draft.text
      : null;

  const trimmedLength = text.trim().length;
  const isTooLong = text.length > MESSAGING_INBOX_REPLY_MAX_LENGTH;
  // The contract accepts 1..20000 characters, so both bounds are checked here
  // rather than letting the provider refuse an empty or runaway body.
  const isSendable =
    trimmedLength >= MESSAGING_INBOX_REPLY_MIN_LENGTH && !isTooLong;

  const handleTextChange = useCallback(
    (value: string) => {
      setText(value);

      // Editing the body makes this a different send, so the finished attempt
      // is dropped and the next one will mint a new idempotency key.
      if (state.kind !== 'draft' && state.kind !== 'requested') {
        resetToDraft();
      }
    },
    [resetToDraft, state.kind],
  );

  // The proposal is never written into the textarea on its own: whatever a
  // person has already typed is theirs. Inserting it is a separate click, and
  // it goes through the same handler as typing, so a finished attempt is
  // dropped: otherwise the Send button could stay hidden, or a retry could
  // replay the previous body instead of the inserted one.
  const insertProposal = useCallback(() => {
    if (proposedText === null) {
      return;
    }

    handleTextChange(proposedText);
  }, [handleTextChange, proposedText]);

  const handleStartOver = useCallback(() => {
    setText('');
    resetToDraft();
    dismissDraft();
  }, [dismissDraft, resetToDraft]);

  const isBotStopped =
    policy.read.kind === 'reported' &&
    policy.read.policy.effectiveMode === 'OFF';

  // A proposal already in hand is dropped when the bot is stopped. Without
  // this, going OFF then back to assisted would resurrect an old draft the
  // policy had invalidated. The human's own text is never touched.
  useEffect(() => {
    if (isBotStopped) {
      dismissDraft();
    }
  }, [dismissDraft, isBotStopped]);

  const isRefused = state.kind === 'failed' && state.failure.kind === 'denied';

  return (
    <StyledForm
      onSubmit={(event) => {
        event.preventDefault();

        if (state.kind !== 'draft' || !isSendable) {
          return;
        }

        sendReply(conversationId, text);
      }}
    >
      {/* One control per Field.Root: Field injects its own aria-labelledby on
          every control it wraps, which would rename a second one. */}
      <Field.Root render={<StyledField />}>
        <Field.Label>{t`Your reply`}</Field.Label>
        <Textarea
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          disabled={state.kind === 'requested'}
          rows={3}
          placeholder={t`Write a reply.`}
        />
        <Field.Description>
          {t`${i18n.number(text.length)} of ${i18n.number(MESSAGING_INBOX_REPLY_MAX_LENGTH)} characters.`}
        </Field.Description>
      </Field.Root>

      {isTooLong && (
        <MessagingInboxNote role="alert">
          <Trans>Too long to send.</Trans>
        </MessagingInboxNote>
      )}

      <StyledSendState>
        {state.kind === 'draft' && trimmedLength > 0 && (
          <MessagingInboxNote>
            <Trans>Draft reply. Not sent.</Trans>
          </MessagingInboxNote>
        )}

        {state.kind === 'requested' && (
          <MessagingInboxNote role="status">
            <Trans>Send requested. No confirmation yet.</Trans>
          </MessagingInboxNote>
        )}

        {state.kind === 'accepted' && (
          <>
            <MessagingInboxNote role="status">
              <Trans>The server took the reply.</Trans>
            </MessagingInboxNote>
            {/* The transport's own answer, verbatim. This — not the line
                above — is what the provider reported. */}
            <MessagingInboxMessageStatus
              status={state.message.status}
              errorCode={state.message.errorCode}
            />
          </>
        )}

        {state.kind === 'unreadable' && (
          <MessagingInboxNote role="alert">
            <Trans>Request sent. Outcome unknown.</Trans>
          </MessagingInboxNote>
        )}

        {state.kind === 'failed' && (
          <>
            <MessagingInboxNote role="alert">
              {isRefused ? (
                <Trans>Not authorised to reply.</Trans>
              ) : (
                <Trans>Send failed.</Trans>
              )}
            </MessagingInboxNote>
            <MessagingInboxDiagnostic message={state.failure.message} />
          </>
        )}
      </StyledSendState>

      {/* What came back from the draft call, when it was not a usable
          proposal. Said plainly, because an empty textarea after pressing the
          button would read as a broken button. */}
      <StyledSendState>
        {draftState.kind === 'requested' && (
          <MessagingInboxNote role="status">
            <Trans>Asking for a draft…</Trans>
          </MessagingInboxNote>
        )}

        {draftState.kind === 'read' && proposedText !== null && (
          <MessagingInboxNote role="status">
            <Trans>Draft proposed. Review it, then send.</Trans>
            <StyledProposal>{proposedText}</StyledProposal>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={insertProposal}
            >
              {t`Insert in my reply`}
            </Button>
          </MessagingInboxNote>
        )}

        {draftState.kind === 'read' && proposedText === null && (
          <MessagingInboxNote role="alert">
            {draftState.draft.status === 'NOT_CONFIGURED' ? (
              <Trans>Drafting is not set up.</Trans>
            ) : draftState.draft.status === 'UNAVAILABLE' ? (
              <Trans>Drafting unavailable.</Trans>
            ) : draftState.draft.mode === 'MANUAL' ? (
              <Trans>Manual mode. No draft proposed.</Trans>
            ) : (
              <Trans>No draft came back.</Trans>
            )}
          </MessagingInboxNote>
        )}

        {draftState.kind === 'unreadable' && (
          <MessagingInboxNote role="alert">
            <Trans>Draft answer unreadable.</Trans>
          </MessagingInboxNote>
        )}

        {draftState.kind === 'failed' && (
          <>
            <MessagingInboxNote role="alert">
              {draftState.failure.kind === 'denied' ? (
                <Trans>Not authorised to draft.</Trans>
              ) : (
                <Trans>Draft request failed.</Trans>
              )}
            </MessagingInboxNote>
            <MessagingInboxDiagnostic message={draftState.failure.message} />
          </>
        )}
      </StyledSendState>

      <StyledActions>
        {state.kind !== 'accepted' && (
          <Button
            type="submit"
            variant="solid"
            size="sm"
            startIcon={<IconSend />}
            loading={state.kind === 'requested'}
            disabled={state.kind !== 'draft' || !isSendable}
          >
            {t`Send`}
          </Button>
        )}

        {/* Proposes text. It never sends: a person presses Send above. */}
        {isNonEmptyString(latestMessageId) && state.kind !== 'requested' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            startIcon={<IconRobot />}
            loading={draftState.kind === 'requested'}
            disabled={draftState.kind === 'requested' || !mayDraft}
            onClick={() => {
              // Guarded here too: a disabled button is a presentation, not a
              // rule, and the rule is the server's policy.
              if (!mayDraft) {
                return;
              }

              requestDraft(conversationId, latestMessageId);
            }}
          >
            {t`Propose a draft`}
          </Button>
        )}

        {/* Replays the attempt already on the wire, same idempotency key.
            Absent on a refusal: a refusal is an answer, not a hiccup. */}
        {retrySend !== null && !isRefused && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={retrySend}
          >
            {t`Retry same send`}
          </Button>
        )}

        {state.kind !== 'draft' && state.kind !== 'requested' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleStartOver}
          >
            {t`New reply`}
          </Button>
        )}
      </StyledActions>
    </StyledForm>
  );
};
