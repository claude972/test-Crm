import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHermesMailboxRuntimeComposer } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';
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
import {
  HermesMailbox,
  type HermesMailboxProviderState,
} from '@/hermes-mailbox-ui/components/HermesMailbox';
import { type HermesMailboxAttachment } from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
import { type HermesMailboxSendAvailability } from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import {
  type HermesMailboxThread,
  type HermesMailboxThreadSummary,
} from '@/hermes-mailbox-ui/types/HermesMailboxThread';

type HermesMailboxRuntimeProps = {
  // Offered only when the parent can really route somewhere. Absent means the
  // unconnected screen names who connects a mailbox instead of showing a
  // button that goes nowhere.
  onConnectProvider?: () => void;
};

// One attachment as the shipped strip can describe it.
//
// There is no availability variant for a file this application can serve, and
// one is not faked: the strip offers no download either way. 'UNSUPPORTED' is
// the server refusing to serve the bytes, and it is said as such.
const readAttachments = (
  message: HermesMailboxRuntimeMessage,
): HermesMailboxAttachment[] =>
  message.attachments.map((attachment) => ({
    id:
      attachment.assetId ??
      'part:' + String(attachment.index ?? message.attachments.indexOf(attachment)),
    name: attachment.filename,
    mimeType: attachment.mimeType,
    // The mail read publishes no per-part size, so none is invented: a missing
    // figure is not a zero-byte file.
    sizeBytes: null,
    availability:
      attachment.state === 'UNSUPPORTED'
        ? { kind: 'unavailable' as const, reason: 'UNSUPPORTED' }
        : { kind: 'unknown' as const },
  }));

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
      attachments: readAttachments(message),
    },
  ],
  // This container reaches no operation that resumes a saved reply draft, so
  // no draft reference is published and the panel offers no resume.
  draft: null,
});

type HermesMailboxRuntimeFolderViewProps = {
  provider: HermesMailboxProviderState;
  folders: HermesMailboxLoad<HermesMailboxFolder[]>;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onBackToFolders: () => void;
  identity: HermesMailboxRuntimeIdentityRead;
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
  const composer = useHermesMailboxRuntimeComposer({ scope, identity });

  const openedMessage =
    message.load.kind === 'ready' ? message.load.value : null;

  const inlineImagesByMessageId = useHermesMailboxRuntimeInlineImages({
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
          : readThread(message.load.value, selectedSummary, isDraftsFolder),
    };
  }, [isDraftsFolder, message.load, selectedSummary]);

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
      thread={thread}
      envelope={composer.envelope}
      onPlanAnswer={composer.planAnswer}
      // No operation resumes a saved reply draft in this slice, so this cannot
      // be reached: `thread.draft` is always null and the panel renders no
      // resume control.
      onResumeDraft={() => {}}
      onCloseComposer={composer.closeComposer}
      inlineImagesByMessageId={inlineImagesByMessageId}
      onBackToFolders={onBackToFolders}
      onBackToThreads={() => setSelectedThreadId(null)}
      sendAvailability={sendAvailability}
      sendState={composer.sendState}
      draftSaveState={composer.draftSaveState}
      onRequestSend={composer.requestSend}
      onSaveDraft={composer.saveDraft}
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
      onConnectProvider={onConnectProvider}
    />
  );
};
