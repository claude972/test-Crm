import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconCornerDownRight, IconShare, IconUsers } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxComposer } from '@/hermes-mailbox-ui/components/HermesMailboxComposer';
import { HermesMailboxHeaders } from '@/hermes-mailbox-ui/components/HermesMailboxHeaders';
import { HermesMailboxLoadNote } from '@/hermes-mailbox-ui/components/HermesMailboxLoadNote';
import { HermesMailboxMessageCard } from '@/hermes-mailbox-ui/components/HermesMailboxMessageCard';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendAvailability,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { type HermesMailboxThread } from '@/hermes-mailbox-ui/types/HermesMailboxThread';

const StyledPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 0;
  min-width: 0;
`;

const StyledSubject = styled.h2`
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StyledMessages = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  min-width: 0;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledDraftBlock = styled.div`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  justify-items: start;
  min-width: 0;
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledEmptyState = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledEmptyTitle = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;

type HermesMailboxThreadPanelProps = {
  thread: HermesMailboxLoad<HermesMailboxThread | null>;
  // The envelope the server planned, once the parent has asked for one.
  // 'ready' with a null value means no answer is being prepared.
  envelope: HermesMailboxLoad<HermesMailboxEnvelope | null>;
  // Asks the parent to have the server plan an answer. This module never
  // works out recipients itself.
  onPlanAnswer: (kind: HermesMailboxComposeKind) => void;
  onResumeDraft: (draftId: string) => void;
  onCloseComposer: () => void;
  inlineImagesByMessageId?: Record<string, HermesMailboxInlineImage[]>;
  sendAvailability: HermesMailboxSendAvailability;
  sendState: HermesMailboxSendState;
  draftSaveState: HermesMailboxDraftSaveState;
  onRequestSend: (composition: HermesMailboxComposition) => void;
  onSaveDraft: (composition: HermesMailboxComposition) => void;
  // Performs the private read for one attachment of the opened message.
  onDownloadAttachment?: (attachmentId: string) => void;
};

// The reading pane, and the editor that opens inside it.
//
// The three answers are three requests to the server. Nothing here derives a
// recipient, so switching from Reply to Forward cannot leak one answer's
// recipients into the other: each one arrives planned.
export const HermesMailboxThreadPanel = ({
  thread,
  envelope,
  onPlanAnswer,
  onResumeDraft,
  onCloseComposer,
  inlineImagesByMessageId = {},
  sendAvailability,
  sendState,
  draftSaveState,
  onRequestSend,
  onSaveDraft,
  onDownloadAttachment,
}: HermesMailboxThreadPanelProps) => {
  const { t } = useLingui();

  // Read before the early returns, because a message that answers nothing is
  // composed with no thread open at all.
  const readyEnvelope = envelope.kind === 'ready' ? envelope.value : null;
  const newEnvelope =
    readyEnvelope !== null && readyEnvelope.kind === 'new'
      ? readyEnvelope
      : null;

  if (thread.kind !== 'ready') {
    return (
      <StyledPanel aria-label={t`Thread`}>
        <HermesMailboxLoadNote
          unavailableHeadline={t`This thread is unavailable.`}
          load={thread}
        />
      </StyledPanel>
    );
  }

  if (thread.value === null) {
    return (
      <StyledPanel aria-label={t`Thread`}>
        {newEnvelope !== null ? (
          <HermesMailboxComposer
            key={`new:${newEnvelope.threadId}`}
            envelope={newEnvelope}
            sendAvailability={sendAvailability}
            sendState={sendState}
            draftSaveState={draftSaveState}
            onRequestSend={onRequestSend}
            onSaveDraft={onSaveDraft}
            onDiscard={onCloseComposer}
          />
        ) : (
          <StyledEmptyState>
            <StyledEmptyTitle>{t`No thread open`}</StyledEmptyTitle>
            <HermesMailboxNote>
              <Trans>Pick a thread from the list.</Trans>
            </HermesMailboxNote>
          </StyledEmptyState>
        )}
      </StyledPanel>
    );
  }

  const openThread = thread.value;
  const plannedEnvelope = readyEnvelope;
  const isPlanning = envelope.kind === 'loading';
  const hasPlanningFailed =
    envelope.kind !== 'ready' && envelope.kind !== 'loading';

  return (
    <StyledPanel aria-label={t`Thread`}>
      <StyledSubject>
        {isNonEmptyString(openThread.subject)
          ? openThread.subject
          : t`No subject`}
      </StyledSubject>

      <HermesMailboxHeaders participants={openThread.participants} />

      {openThread.messages.length === 0 ? (
        <HermesMailboxNote>
          <Trans>No message in this thread.</Trans>
        </HermesMailboxNote>
      ) : (
        <StyledMessages>
          {openThread.messages.map((message) => (
            <HermesMailboxMessageCard
              key={message.id}
              message={message}
              inlineImages={inlineImagesByMessageId[message.id]}
              onDownloadAttachment={onDownloadAttachment}
            />
          ))}
        </StyledMessages>
      )}

      {/* A draft saved against this thread. Picking it up asks the server to
          plan it, which is what returns its saved recipients and text. */}
      {openThread.draft !== null && plannedEnvelope === null && !isPlanning && (
        <StyledDraftBlock>
          <HermesMailboxNote role="status">
            <Trans>A saved draft is waiting on this thread. It was never sent.</Trans>
          </HermesMailboxNote>
          <Button
            type="button"
            variant="solid"
            size="sm"
            onClick={() => {
              if (openThread.draft !== null) {
                onResumeDraft(openThread.draft.id);
              }
            }}
          >
            {t`Resume this draft`}
          </Button>
        </StyledDraftBlock>
      )}

      {/* An unsent draft nothing here can address. No resume is offered:
          a button with no identity behind it would be a false affordance. */}
      {openThread.draft === null && openThread.isDraftIdentityUnknown && (
        <HermesMailboxNote role="status">
          <Trans>
            This draft was not saved from this browser, so its identity is
            unknown here and it cannot be resumed. It is still on the
            provider, and it was never sent.
          </Trans>
        </HermesMailboxNote>
      )}

      {isPlanning && (
        <HermesMailboxNote role="status">
          <Trans>Preparing the answer on the server…</Trans>
        </HermesMailboxNote>
      )}

      {/* No envelope means no editor. A locally guessed set of recipients is
          exactly what the contract took away from this client. */}
      {hasPlanningFailed && (
        <HermesMailboxLoadNote
          unavailableHeadline={t`The answer could not be prepared, so no editor is opened.`}
          load={envelope}
        />
      )}

      {plannedEnvelope !== null ? (
        <HermesMailboxComposer
          key={`${plannedEnvelope.threadId}:${plannedEnvelope.kind}`}
          envelope={plannedEnvelope}
          sendAvailability={sendAvailability}
          sendState={sendState}
          draftSaveState={draftSaveState}
          onRequestSend={onRequestSend}
          onSaveDraft={onSaveDraft}
          onDiscard={onCloseComposer}
        />
      ) : (
        <StyledActions>
          <Button
            type="button"
            variant="solid"
            size="sm"
            startIcon={<IconCornerDownRight />}
            loading={isPlanning}
            disabled={isPlanning}
            onClick={() => onPlanAnswer('reply')}
          >
            {t`Reply`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            startIcon={<IconUsers />}
            disabled={isPlanning}
            onClick={() => onPlanAnswer('replyAll')}
          >
            {t`Reply to all`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            startIcon={<IconShare />}
            disabled={isPlanning}
            onClick={() => onPlanAnswer('forward')}
          >
            {t`Forward`}
          </Button>
        </StyledActions>
      )}

      {/* Explains a visible absence: the images that are not there. */}
      <HermesMailboxNote>
        <Trans>
          Message content is shown sanitised, and no remote resource is
          fetched. Embedded images are private attachments.
        </Trans>
      </HermesMailboxNote>
    </StyledPanel>
  );
};
