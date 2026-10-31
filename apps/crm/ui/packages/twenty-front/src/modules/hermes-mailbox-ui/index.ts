// The module's public surface: everything a parent needs to mount a mailbox,
// plus the one body reader that must stay single-copy in the application.

export {
  HermesMailbox,
  type HermesMailboxProviderState,
} from '@/hermes-mailbox-ui/components/HermesMailbox';
export { HermesMailboxAttachmentStrip } from '@/hermes-mailbox-ui/components/HermesMailboxAttachmentStrip';
export { HermesMailboxBodyView } from '@/hermes-mailbox-ui/components/HermesMailboxBodyView';
export { HermesMailboxComposer } from '@/hermes-mailbox-ui/components/HermesMailboxComposer';
export { HermesMailboxFolderPanel } from '@/hermes-mailbox-ui/components/HermesMailboxFolderPanel';
export { HermesMailboxHeaders } from '@/hermes-mailbox-ui/components/HermesMailboxHeaders';
export { HermesMailboxMessageCard } from '@/hermes-mailbox-ui/components/HermesMailboxMessageCard';
export { HermesMailboxThreadListPanel } from '@/hermes-mailbox-ui/components/HermesMailboxThreadListPanel';
export { HermesMailboxThreadPanel } from '@/hermes-mailbox-ui/components/HermesMailboxThreadPanel';

export { useHermesMailboxFolderLabels } from '@/hermes-mailbox-ui/hooks/useHermesMailboxFolderLabels';

export {
  type HermesMailboxAddress,
  type HermesMailboxBcc,
} from '@/hermes-mailbox-ui/types/HermesMailboxAddress';
export {
  type HermesMailboxAttachment,
  type HermesMailboxAttachmentAvailability,
  type HermesMailboxInlineImage,
} from '@/hermes-mailbox-ui/types/HermesMailboxAttachment';
export {
  type HermesMailboxBody,
  type HermesMailboxQuote,
} from '@/hermes-mailbox-ui/types/HermesMailboxBody';
export {
  HERMES_MAILBOX_COMPOSE_KINDS,
  HERMES_MAILBOX_NEW_KIND,
  type HermesMailboxComposeKind,
  type HermesMailboxComposition,
  type HermesMailboxCompositionKind,
  type HermesMailboxDraftSaveState,
  type HermesMailboxEnvelope,
  type HermesMailboxSendAvailability,
  type HermesMailboxSender,
  type HermesMailboxSenderAuthority,
  type HermesMailboxSendState,
} from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
export {
  HERMES_MAILBOX_FOLDER_ROLES,
  isHermesMailboxFolderRole,
  type HermesMailboxFolder,
  type HermesMailboxFolderCounts,
  type HermesMailboxFolderRole,
} from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
export { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
export { type HermesMailboxMessage } from '@/hermes-mailbox-ui/types/HermesMailboxMessage';
export {
  type HermesMailboxParticipants,
  type HermesMailboxSavedDraft,
  type HermesMailboxThread,
  type HermesMailboxThreadSummary,
} from '@/hermes-mailbox-ui/types/HermesMailboxThread';

export {
  formatHermesMailboxAddress,
  isHermesMailboxAddressUsable,
  normalizeHermesMailboxEmail,
  parseHermesMailboxAddress,
  splitHermesMailboxAddressList,
} from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';
export {
  readHermesMailboxBody,
  type HermesMailboxBodyRender,
  type HermesMailboxHtmlRender,
} from '@/hermes-mailbox-ui/utils/readHermesMailboxBody';
export {
  readHermesMailboxCount,
  readHermesMailboxFileSize,
  type HermesMailboxCount,
  type HermesMailboxFileSize,
} from '@/hermes-mailbox-ui/utils/readHermesMailboxCount';

// Offline reference only. The server plans envelopes; nothing here is wired
// into a component, and it must not be used to decide recipients.
export {
  collectHermesMailboxThreadAttachments,
  computeHermesMailboxSubject,
  planHermesMailboxEnvelopeOffline,
  type HermesMailboxIdentity,
} from '@/hermes-mailbox-ui/utils/planHermesMailboxEnvelopeOffline';
