import { useCallback, useEffect, useMemo, useState } from 'react';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { HermesMailboxRuntimeAssistantDraft } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntimeAssistantDraft';
import { HermesMailboxRuntimeBotPanel } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntimeBotPanel';
import {
  type HermesMailboxRuntimeSavedDraft,
  useHermesMailboxRuntimeComposer,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';
import { useHermesMailboxRuntimeAttachmentDownload } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeAttachmentDownload';
import {
  type HermesMailboxRuntimeDraftIdentities,
  useHermesMailboxRuntimeDraftIdentities,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeDraftIdentities';
import { useHermesMailboxRuntimeFolders } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeFolders';
import {
  type HermesMailboxRuntimeIdentityRead,
  useHermesMailboxRuntimeIdentity,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
import { useHermesMailboxRuntimeInlineImages } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeInlineImages';
import { useHermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeMessage';
import { useHermesMailboxRuntimeMessages } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeMessages';
import { type HermesMailboxRuntimeMessage } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';
import { type HermesMailboxRuntimeScope } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimeScope';
import { type HermesMailboxRuntimeDraftScope } from '@/hermes-mailbox-runtime/utils/hermesMailboxRuntimeDraftIdentities';
import { readHermesMailboxRuntimeMessageAttachments } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeAttachments';
import {
  HermesMailbox,
  type HermesMailboxProviderState,
} from '@/hermes-mailbox-ui/components/HermesMailbox';
import { type HermesMailboxSendAvailability } from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import {
  type HermesMailboxThread,
  type HermesMailboxThreadSummary,
} from '@/hermes-mailbox-ui/types/HermesMailboxThread';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

type HermesMailboxRuntimeProps = {
  // Offered only when the parent can really route somewhere. Absent means the
  // unconnected screen names who connects a mailbox instead of showing a
  // button that goes nowhere.
  onConnectProvider?: () => void;
};

// The thread panel's one message.
//
// The folder listing is one row per message, which is what the contract
// publishes today, so a "thread" here is the message that was opened. Its
// instant comes from the row it was opened from, because the read payload
// carries no date of its own.
const readThread = (
  message: HermesMailboxRuntimeMessage,
  summary: HermesMailboxThreadSummary | null,
  isDraftsFolder: boolean,
  savedDraft: HermesMailboxRuntimeSavedDraft | null,
): HermesMailboxThread => ({
  id: message.uid,
  subject: message.subject,
  participants: {
    from: message.from,
    // The read payload does not publish Reply-To separately. The planning
    // operation applies the preference server-side; nothing is shown here that
    // the server did not send.
    replyTo: null,
    to: message.to,
    cc: message.cc,
    bcc: message.bcc,
  },
  messages: [
    {
      id: message.uid,
      author: message.from,
      occurredAt: summary?.lastMessageAt ?? null,
      // The provider's own answer, never inferred from the author matching our
      // own address.
      isOutbound:
        message.direction === null ? null : message.direction === 'OUTBOUND',
      // A message read out of the provider's Drafts folder was never emitted,
      // and the card says so in words.
      isUnsentDraft: isDraftsFolder,
      body: message.body,
      // The server does not split the quoted history out of the body, so no
      // split is attempted here.
      quote: null,
      attachments: readHermesMailboxRuntimeMessageAttachments(message),
    },
  ],
  // A resume is offered only on the exact native message an identity the
  // server issued names: same folder, same UID, same UIDVALIDITY, which is
  // what identifies a message in IMAP. Re-checked here so this reader never
  // offers a resume against a message the identity does not address.
  draft:
    savedDraft !== null &&
    savedDraft.folder === message.folder &&
    savedDraft.uid === message.uid &&
    savedDraft.uidValidity === message.uidValidity
      ? { id: savedDraft.draftId, savedAt: savedDraft.savedAt }
      : null,
  // A native draft whose stable identity this browser was never issued.
  // Nothing published lists those identities, so there is no resume to offer
  // and the pane says why rather than showing a button that cannot work.
  isDraftIdentityUnknown: isDraftsFolder && savedDraft === null,
});

type HermesMailboxRuntimeFolderViewProps = {
  provider: HermesMailboxProviderState;
  folders: HermesMailboxLoad<HermesMailboxFolder[]>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onBackToFolders: () => void;
  identity: HermesMailboxRuntimeIdentityRead;
  draftIdentities: HermesMailboxRuntimeDraftIdentities;
  onConnectProvider?: () => void;
};

// Everything below the folder: the list, the opened message and the editor.
//
// Mounted under a key tied to the folder, so changing folder starts clean
// instead of merging two folders' UIDs — which, with UID pagination, would be
// a list nothing could open.
const HermesMailboxRuntimeFolderView = ({
  provider,
  folders,
  selectedFolderId,
  onSelectFolder,
  onBackToFolders,
  identity,
  draftIdentities,
  onConnectProvider,
}: HermesMailboxRuntimeFolderViewProps) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const messages = useHermesMailboxRuntimeMessages({
    folder: selectedFolderId,
  });

  // The UID and the validity travel together or not at all.
  const scope = useMemo<HermesMailboxRuntimeScope | null>(
    () =>
      selectedFolderId === null ||
      selectedThreadId === null ||
      messages.uidValidity === null
        ? null
        : {
            folder: selectedFolderId,
            uid: selectedThreadId,
            uidValidity: messages.uidValidity,
          },
    [messages.uidValidity, selectedFolderId, selectedThreadId],
  );

  const message = useHermesMailboxRuntimeMessage({ scope });

  const openedMessage =
    message.load.kind === 'ready' ? message.load.value : null;

  // Looked up against the location the SERVER published on its read of this
  // very message, never against the scope this client asked under.
  const savedDraft = draftIdentities.find(
    openedMessage?.folder ?? null,
    openedMessage?.uid ?? null,
    openedMessage?.uidValidity ?? null,
  );

  const composer = useHermesMailboxRuntimeComposer({
    scope,
    identity,
    message: openedMessage,
    savedDraft,
    onSavedDraft: draftIdentities.remember,
  });

  const inlineImagesByMessageId = useHermesMailboxRuntimeInlineImages({
    message: openedMessage,
  });

  const downloadAttachment = useHermesMailboxRuntimeAttachmentDownload({
    message: openedMessage,
  });

  const selectedSummary =
    messages.load.kind === 'ready'
      ? (messages.load.value.find((row) => row.id === selectedThreadId) ?? null)
      : null;

  const isDraftsFolder =
    folders.kind === 'ready' &&
    folders.value.find((folder) => folder.id === selectedFolderId)?.role ===
      'drafts';

  const thread = useMemo<HermesMailboxLoad<HermesMailboxThread | null>>(() => {
    if (message.load.kind !== 'ready') {
      return message.load;
    }

    return {
      kind: 'ready',
      value:
        message.load.value === null
          ? null
          : readThread(
              message.load.value,
              selectedSummary,
              isDraftsFolder,
              savedDraft,
            ),
    };
  }, [isDraftsFolder, message.load, savedDraft, selectedSummary]);

  // `null` is the honest answer while the mailbox's own address is unknown:
  // the send control is left out rather than offered for an emission that
  // would have no authorised sender.
  const sendAvailability: HermesMailboxSendAvailability =
    provider.kind === 'notConfigured'
      ? false
      : identity.identity.kind === 'known'
        ? true
        : null;

  const selectThread = useCallback(
    (threadId: string) => {
      setSelectedThreadId(threadId);
      composer.closeComposer();
    },
    [composer],
  );

  return (
    <HermesMailbox
      provider={provider}
      mailboxAddress={
        identity.identity.kind === 'known'
          ? identity.identity.mailboxAddress
          : null
      }
      folders={folders}
      selectedFolderId={selectedFolderId}
      onSelectFolder={onSelectFolder}
      threads={messages.load}
      selectedThreadId={selectedThreadId}
      onSelectThread={selectThread}
      onReloadThreads={messages.reload}
      // Offered only when the server handed back a cursor and the client's own
      // page bound has not been reached. Absent means no control, rather than
      // one that does nothing.
      onLoadMoreThreads={
        messages.nextCursor !== null && !messages.hasReachedPageLimit
          ? messages.loadMore
          : undefined
      }
      isLoadingMoreThreads={messages.isLoadingMore}
      // A message that answers nothing needs an authorised sender like any
      // other. Without a resolved mailbox the action is left out.
      onComposeNew={
        identity.identity.kind === 'known' && provider.kind !== 'notConfigured'
          ? composer.composeNew
          : undefined
      }
      thread={thread}
      // The bot is keyed on the canonical conversation the mail read
      // published for this message, never on anything derived locally.
      botModeSlot={
        openedMessage === null ? undefined : (
          <HermesMailboxRuntimeBotPanel
            conversationId={openedMessage.conversationId}
          />
        )
      }
      renderAssistantDraft={
        openedMessage === null
          ? undefined
          : (insertBody) => (
              <HermesMailboxRuntimeAssistantDraft
                conversationId={openedMessage.conversationId}
                messageId={openedMessage.messageId}
                onInsert={insertBody}
              />
            )
      }
      envelope={composer.envelope}
      onPlanAnswer={composer.planAnswer}
      onResumeDraft={composer.resumeDraft}
      onCloseComposer={composer.closeComposer}
      inlineImagesByMessageId={inlineImagesByMessageId}
      onBackToFolders={onBackToFolders}
      onBackToThreads={() => setSelectedThreadId(null)}
      sendAvailability={sendAvailability}
      sendState={composer.sendState}
      draftSaveState={composer.draftSaveState}
      onRequestSend={composer.requestSend}
      onSaveDraft={composer.saveDraft}
      onDownloadAttachment={downloadAttachment}
      onConnectProvider={onConnectProvider}
    />
  );
};

// The mailbox, wired to the V4 mail operations.
//
// It reads on mount — folders, then the first page of the selected folder —
// and emits nothing until somebody asks for it. Planning, saving and sending
// are all driven from the editor the person opened.
export const HermesMailboxRuntime = ({
  onConnectProvider,
}: HermesMailboxRuntimeProps) => {
  const folders = useHermesMailboxRuntimeFolders();
  const identity = useHermesMailboxRuntimeIdentity();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const currentUser = useAtomStateValue(currentUserState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  // Who an identity belongs to: this person, in this company, on this bound
  // account, under this generation of the binding. One part missing and there
  // is no scope, so nothing is read or written at all.
  const draftScope = useMemo<HermesMailboxRuntimeDraftScope | null>(() => {
    const userId = currentUser?.id ?? null;
    const workspaceId = currentWorkspace?.id ?? null;

    if (
      userId === null ||
      workspaceId === null ||
      identity.identity.kind !== 'known' ||
      identity.identity.connectionRevision === null
    ) {
      return null;
    }

    return {
      userId,
      workspaceId,
      connectedAccountId: identity.identity.connectedAccountId,
      connectionRevision: identity.identity.connectionRevision,
    };
  }, [currentUser?.id, currentWorkspace?.id, identity.identity]);

  // Outside the component tree on purpose: a draft is saved from the inbox
  // and resumed from the provider's Drafts folder, so the identity the server
  // issued has to survive that move and a reload with it.
  const draftIdentities = useHermesMailboxRuntimeDraftIdentities(draftScope);

  // The inbox is opened once the folders are known, so the screen lands on a
  // list rather than on a folder picker. A mailbox the provider publishes
  // without an inbox role falls back to its first selectable folder.
  useEffect(() => {
    if (folders.load.kind !== 'ready' || selectedFolderId !== null) {
      return;
    }

    const preferred =
      folders.load.value.find((folder) => folder.role === 'inbox') ??
      folders.load.value[0];

    if (preferred !== undefined) {
      setSelectedFolderId(preferred.id);
    }
  }, [folders.load, selectedFolderId]);

  return (
    <HermesMailboxRuntimeFolderView
      key={selectedFolderId ?? '@noFolder'}
      provider={folders.provider}
      folders={folders.load}
      selectedFolderId={selectedFolderId}
      onSelectFolder={setSelectedFolderId}
      onBackToFolders={() => setSelectedFolderId(null)}
      identity={identity}
      draftIdentities={draftIdentities}
      onConnectProvider={onConnectProvider}
    />
  );
};
