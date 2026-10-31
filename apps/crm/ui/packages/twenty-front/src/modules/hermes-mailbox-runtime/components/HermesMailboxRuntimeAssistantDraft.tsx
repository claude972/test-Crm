import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useEffect } from 'react';
import { IconRobot } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { useMessagingInboxBotPolicy } from '@/messaging-inbox/hooks/useMessagingInboxBotPolicy';
import { useMessagingInboxDraftReply } from '@/messaging-inbox/hooks/useMessagingInboxDraftReply';

const StyledBlock = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  justify-items: start;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledProposal = styled.p`
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
`;

type HermesMailboxRuntimeAssistantDraftProps = {
  conversationId: string | null;
  // The canonical message a draft answers. The operation requires one, so
  // without it no draft is asked for.
  messageId: string | null;
  // Puts text into the editor's body. The only way a proposal reaches the
  // message, and it is only ever called from an explicit click.
  onInsert: (text: string) => void;
};

// A bot draft for the mail answer being written.
//
// It asks and stops there. There is no path from here to any send mutation,
// and no caller can give it one: a proposal is inserted by a person and sent
// by a person, which is the separate explicit human call the contract wants.
//
// The policy decides whether asking is even offered, and the policy is the
// server's. Under OFF nothing is offered and nothing is called. An unreadable
// policy closes the action rather than opening it on a guess.
export const HermesMailboxRuntimeAssistantDraft = ({
  conversationId,
  messageId,
  onInsert,
}: HermesMailboxRuntimeAssistantDraftProps) => {
  const { t } = useLingui();

  const policy = useMessagingInboxBotPolicy(conversationId);
  const { state, requestDraft, dismissDraft } = useMessagingInboxDraftReply();

  const known = policy.read.kind === 'reported' ? policy.read.policy : null;
  const isBotStopped = known?.effectiveMode === 'OFF';

  const mayDraft =
    known !== null && known.effectiveMode !== 'OFF' && known.canDraft;

  // A proposal already in hand is dropped once the bot is stopped: an answer
  // computed before the change can still land after it, and keeping it would
  // reopen a door the policy has closed. The human's own text is untouched.
  useEffect(() => {
    if (isBotStopped === true && state.kind !== 'idle') {
      dismissDraft();
    }
  }, [dismissDraft, isBotStopped, state.kind]);

  const proposedText =
    mayDraft &&
    state.kind === 'read' &&
    state.draft.mode === 'DRAFT' &&
    state.draft.status === 'READY' &&
    isNonEmptyString(state.draft.text)
      ? state.draft.text
      : null;

  return (
    <StyledBlock>
      {isBotStopped === true && (
        <HermesMailboxNote role="status">
          <Trans>
            The bot is stopped on this thread, so no draft is prepared. Write
            the answer yourself and send it.
          </Trans>
        </HermesMailboxNote>
      )}

      {known === null && (
        <HermesMailboxNote role="status">
          <Trans>
            The bot policy could not be read, so no draft is offered here.
            Writing the answer by hand still works.
          </Trans>
        </HermesMailboxNote>
      )}

      {known !== null && !isBotStopped && !known.canDraft && (
        <HermesMailboxNote role="status">
          <Trans>No draft can be prepared on this thread.</Trans>
        </HermesMailboxNote>
      )}

      {mayDraft && messageId === null && (
        <HermesMailboxNote role="status">
          <Trans>
            The server published no message to answer, so no draft can be
            asked for.
          </Trans>
        </HermesMailboxNote>
      )}

      {mayDraft && messageId !== null && conversationId !== null && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          startIcon={<IconRobot />}
          loading={state.kind === 'requested'}
          disabled={state.kind === 'requested'}
          onClick={() => requestDraft(conversationId, messageId)}
        >
          {t`Ask the bot for a draft`}
        </Button>
      )}

      {state.kind === 'requested' && (
        <HermesMailboxNote role="status">
          <Trans>Asking for a draft…</Trans>
        </HermesMailboxNote>
      )}

      {/* Model-written text. Shown as plain text for a person to read, never
          as markup, and nothing is acted on from it. */}
      {proposedText !== null && (
        <>
          <StyledProposal>{proposedText}</StyledProposal>
          <Button
            type="button"
            variant="solid"
            size="sm"
            onClick={() => onInsert(proposedText)}
          >
            {t`Insert this draft`}
          </Button>
          <HermesMailboxNote role="status">
            <Trans>
              A proposal. Nothing has been sent, and inserting it sends
              nothing.
            </Trans>
          </HermesMailboxNote>
        </>
      )}

      {/* NOT_CONFIGURED and UNAVAILABLE are different facts: no bot is set up,
          against a bot that is set up and did not answer. Kept apart. */}
      {state.kind === 'read' && state.draft.status === 'NOT_CONFIGURED' && (
        <HermesMailboxNote role="status">
          <Trans>No bot is configured, so no draft was prepared.</Trans>
        </HermesMailboxNote>
      )}

      {state.kind === 'read' && state.draft.status === 'UNAVAILABLE' && (
        <HermesMailboxNote role="alert">
          <Trans>
            The bot is configured but did not answer, so there is no draft.
          </Trans>
        </HermesMailboxNote>
      )}

      {state.kind === 'unreadable' && (
        <HermesMailboxNote role="alert">
          <Trans>The draft answer could not be read, so none is shown.</Trans>
        </HermesMailboxNote>
      )}

      {state.kind === 'failed' && (
        <HermesMailboxNote role="alert">
          {isNonEmptyString(state.failure.message)
            ? t`No draft: ${state.failure.message}`
            : t`No draft was prepared.`}
        </HermesMailboxNote>
      )}
    </StyledBlock>
  );
};
