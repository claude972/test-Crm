import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { IconArrowLeft, IconMail } from 'kovaa-lab-ui/icon';
import { Button } from 'kovaa-lab-ui/primitives/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesMailboxDiagnostic } from '@/hermes-mailbox-ui/components/HermesMailboxDiagnostic';
import { HermesMailboxFolderPanel } from '@/hermes-mailbox-ui/components/HermesMailboxFolderPanel';
import { HermesMailboxNote } from '@/hermes-mailbox-ui/components/HermesMailboxNote';
import { HermesMailboxThreadListPanel } from '@/hermes-mailbox-ui/components/HermesMailboxThreadListPanel';
import { HermesMailboxThreadPanel } from '@/hermes-mailbox-ui/components/HermesMailboxThreadPanel';
import { useHermesMailboxFolderLabels } from '@/hermes-mailbox-ui/hooks/useHermesMailboxFolderLabels';
import { type HermesMailboxInlineImage } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import {
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendAvailability,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import {
  type HermesMailboxThread,
  type HermesMailboxThreadSummary,
} from '@/hermes-mailbox-ui/types/HermesMailboxThread';

// Three panels side by side on a wide screen; one at a time below the mobile
// breakpoint. The depth navigation is pure CSS on one data attribute, so there
// is no resize listener to disagree with the layout, and `display: none` keeps
// the hidden panels out of the tab order and the accessibility tree.
const StyledMailbox = styled.div`
  align-items: start;
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: 200px 320px minmax(0, 1fr);
  min-height: 0;
  min-width: 0;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr);

    &[data-level='folders'] [data-panel='threads'],
    &[data-level='folders'] [data-panel='thread'],
    &[data-level='threads'] [data-panel='folders'],
    &[data-level='threads'] [data-panel='thread'],
    &[data-level='thread'] [data-panel='folders'],
    &[data-level='thread'] [data-panel='threads'] {
      display: none;
    }
  }
`;

const StyledColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 0;
  min-width: 0;
`;

const StyledBack = styled.div`
  display: none;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    display: flex;
  }
`;

// The unconfigured mailbox. Deliberately not a centred hero: a left-aligned
// block that states the fact, then lists what is unavailable, so an operator
// can tell this screen apart from an empty inbox at a glance.
const StyledUnconfigured = styled.section`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-left: 2px solid ${themeCssVariables.accent.primary};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  max-width: 640px;
  min-width: 0;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledUnconfiguredHeading = styled.h2`
  align-items: center;
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
  min-width: 0;

  & > svg {
    block-size: calc(${themeCssVariables.icon.size.md} * 1px);
    color: ${themeCssVariables.font.color.tertiary};
    flex-shrink: 0;
    inline-size: calc(${themeCssVariables.icon.size.md} * 1px);
    stroke-width: ${themeCssVariables.icon.stroke.md};
  }
`;

const StyledUnconfiguredText = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: ${themeCssVariables.text.lineHeight.md};
  margin: 0;
  min-width: 0;
`;

const StyledUnavailableList = styled.ul`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  min-width: 0;
  padding: ${themeCssVariables.spacing[3]} 0 0;
`;

// The state is carried by the written word, never by colour alone.
const StyledUnavailableRow = styled.li`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  min-width: 0;
`;

const StyledUnavailableMark = styled.span`
  border: 1px solid ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.pill};
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: 0.04em;
  padding: 0 ${themeCssVariables.spacing[1]};
  text-transform: uppercase;
`;

export type HermesMailboxProviderState =
  // No provider is connected. An explicit fact with its own screen.
  | { kind: 'notConfigured'; message: string | null }
  | { kind: 'configured' };

type HermesMailboxProps = {
  provider: HermesMailboxProviderState;
  mailboxAddress: string | null;

  folders: HermesMailboxLoad<HermesMailboxFolder[]>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;

  threads: HermesMailboxLoad<HermesMailboxThreadSummary[]>;
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onReloadThreads?: () => void;
  // Absent means the parent has no further page to ask for.
  onLoadMoreThreads?: () => void;
  isLoadingMoreThreads?: boolean;
  // Opens an editor for a message that answers nothing. Absent means the
  // parent cannot compose one, and the action is left out.
  onComposeNew?: () => void;

  thread: HermesMailboxLoad<HermesMailboxThread | null>;
  envelope: HermesMailboxLoad<HermesMailboxEnvelope | null>;
  onPlanAnswer: (kind: HermesMailboxComposeKind) => void;
  onResumeDraft: (draftId: string) => void;
  onCloseComposer: () => void;
  inlineImagesByMessageId?: Record<string, HermesMailboxInlineImage[]>;

  // Back out of a level on a small screen. The parent decides what that means
  // for its own routing.
  onBackToFolders: () => void;
  onBackToThreads: () => void;

  sendAvailability: HermesMailboxSendAvailability;
  sendState: HermesMailboxSendState;
  draftSaveState: HermesMailboxDraftSaveState;
  onRequestSend: (composition: HermesMailboxComposition) => void;
  onSaveDraft: (composition: HermesMailboxComposition) => void;

  // Performs the private read for one attachment of the opened message.
  // Absent means no download is offered.
  onDownloadAttachment?: (attachmentId: string) => void;

  // Offered only when the parent can really route somewhere. Absent means no
  // button, and the screen says who connects a mailbox instead.
  onConnectProvider?: () => void;
};

// The mailbox.
//
// It fetches nothing: every value arrives as a prop and every action leaves as
// a callback, which is what lets it be built and reviewed before the mail API
// exists.
export const HermesMailbox = ({
  provider,
  mailboxAddress,
  folders,
  selectedFolderId,
  onSelectFolder,
  threads,
  selectedThreadId,
  onSelectThread,
  onReloadThreads,
  onLoadMoreThreads,
  isLoadingMoreThreads,
  onComposeNew,
  thread,
  envelope,
  onPlanAnswer,
  onResumeDraft,
  onCloseComposer,
  inlineImagesByMessageId,
  onBackToFolders,
  onBackToThreads,
  sendAvailability,
  sendState,
  draftSaveState,
  onRequestSend,
  onSaveDraft,
  onDownloadAttachment,
  onConnectProvider,
}: HermesMailboxProps) => {
  const { t } = useLingui();
  const { describeFolder } = useHermesMailboxFolderLabels();

  if (provider.kind === 'notConfigured') {
    return (
      <StyledUnconfigured aria-label={t`Mailbox not connected`}>
        <StyledUnconfiguredHeading>
          <IconMail aria-hidden="true" />
          {t`No mailbox is connected`}
        </StyledUnconfiguredHeading>

        <StyledUnconfiguredText>
          <Trans>
            This workspace has no mail provider yet, so there is no mail to
            read here. This is not an empty inbox: nothing has been fetched,
            and nothing has been lost.
          </Trans>
        </StyledUnconfiguredText>

        <StyledUnavailableList>
          <StyledUnavailableRow>
            {t`Reading folders and threads`}
            <StyledUnavailableMark>{t`Unavailable`}</StyledUnavailableMark>
          </StyledUnavailableRow>
          <StyledUnavailableRow>
            {t`Replying and forwarding`}
            <StyledUnavailableMark>{t`Unavailable`}</StyledUnavailableMark>
          </StyledUnavailableRow>
          <StyledUnavailableRow>
            {t`Saving drafts`}
            <StyledUnavailableMark>{t`Unavailable`}</StyledUnavailableMark>
          </StyledUnavailableRow>
          <StyledUnavailableRow>
            {t`Opening attachments`}
            <StyledUnavailableMark>{t`Unavailable`}</StyledUnavailableMark>
          </StyledUnavailableRow>
        </StyledUnavailableList>

        {onConnectProvider !== undefined ? (
          <div>
            <Button
              type="button"
              variant="solid"
              size="sm"
              onClick={onConnectProvider}
            >
              {t`Connect a mailbox`}
            </Button>
          </div>
        ) : (
          <HermesMailboxNote>
            <Trans>
              A workspace administrator connects a mailbox from the workspace
              settings.
            </Trans>
          </HermesMailboxNote>
        )}

        <HermesMailboxDiagnostic message={provider.message} />
      </StyledUnconfigured>
    );
  }

  // An open editor lives in the thread column, and a message that answers
  // nothing has no thread to select — so the depth follows the editor too,
  // otherwise composing on a narrow screen would happen in a hidden panel.
  const isComposing = envelope.kind === 'ready' && envelope.value !== null;

  const level =
    selectedThreadId !== null || isComposing
      ? 'thread'
      : selectedFolderId !== null
        ? 'threads'
        : 'folders';

  const selectedFolder =
    folders.kind === 'ready'
      ? (folders.value.find((entry) => entry.id === selectedFolderId) ?? null)
      : null;

  const folderLabel =
    selectedFolder === null ? null : describeFolder(selectedFolder);

  return (
    <StyledMailbox data-level={level}>
      <StyledColumn data-panel="folders">
        <HermesMailboxFolderPanel
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          mailboxAddress={mailboxAddress}
        />
      </StyledColumn>

      <StyledColumn data-panel="threads">
        <StyledBack>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            startIcon={<IconArrowLeft />}
            onClick={onBackToFolders}
          >
            {t`Folders`}
          </Button>
        </StyledBack>

        <HermesMailboxThreadListPanel
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={onSelectThread}
          onReloadThreads={onReloadThreads}
          onLoadMoreThreads={onLoadMoreThreads}
          isLoadingMoreThreads={isLoadingMoreThreads}
          onComposeNew={onComposeNew}
          folderLabel={isNonEmptyString(folderLabel) ? folderLabel : null}
        />
      </StyledColumn>

      <StyledColumn data-panel="thread">
        <StyledBack>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            startIcon={<IconArrowLeft />}
            onClick={onBackToThreads}
          >
            {t`Threads`}
          </Button>
        </StyledBack>

        <HermesMailboxThreadPanel
          thread={thread}
          envelope={envelope}
          onPlanAnswer={onPlanAnswer}
          onResumeDraft={onResumeDraft}
          onCloseComposer={onCloseComposer}
          inlineImagesByMessageId={inlineImagesByMessageId}
          sendAvailability={sendAvailability}
          sendState={sendState}
          draftSaveState={draftSaveState}
          onRequestSend={onRequestSend}
          onSaveDraft={onSaveDraft}
          onDownloadAttachment={onDownloadAttachment}
        />
      </StyledColumn>
    </StyledMailbox>
  );
};
