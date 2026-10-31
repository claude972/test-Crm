// The module's public surface: the container a route mounts, plus the hooks and
// readers a route may need around it.
//
// The mailbox's own presentation lives in `hermes-mailbox-ui` and is not
// re-exported here: this module only supplies the real V4 mail operations.

export { HermesMailboxRuntime } from '@/hermes-mailbox-runtime/components/HermesMailboxRuntime';

export { useHermesMailboxRuntimeAttachmentDownload } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeAttachmentDownload';
export {
  useHermesMailboxRuntimeComposer,
  type HermesMailboxRuntimeComposer,
  type HermesMailboxRuntimeSavedDraft,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';
export {
  useHermesMailboxRuntimeFolders,
  type HermesMailboxRuntimeFoldersRead,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeFolders';
export {
  useHermesMailboxRuntimeIdentity,
  type HermesMailboxRuntimeIdentity,
  type HermesMailboxRuntimeIdentityRead,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
export { useHermesMailboxRuntimeInlineImages } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeInlineImages';
export {
  useHermesMailboxRuntimeMessage,
  type HermesMailboxRuntimeMessageRead,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeMessage';
export {
  useHermesMailboxRuntimeMessages,
  type HermesMailboxRuntimeMessagesRead,
} from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeMessages';

export { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
export { HERMES_MAIL_FOLDERS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailFoldersV4';
export { HERMES_MAIL_MESSAGES_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessagesV4';
export { HERMES_MAIL_MESSAGE_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessageV4';
export { HERMES_MEDIA_READ } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMediaRead';
export { HERMES_MAIL_CLONE_ATTACHMENT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCloneAttachmentV4';
export { HERMES_MAIL_CREATE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailCreateDraftV4';
export { HERMES_MAIL_SEND_NEW_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendNewV4';
export { HERMES_MAIL_PLAN_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailPlanV4';
export { HERMES_MAIL_SAVE_DRAFT_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSaveDraftV4';
export { HERMES_MAIL_SEND_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-mutations/hermesMailSendV4';

export {
  HERMES_MAILBOX_RUNTIME_COMPOSE_MODES,
  HERMES_MAILBOX_RUNTIME_ERROR_CODES,
  HERMES_MAILBOX_RUNTIME_MAX_PAGES,
  HERMES_MAILBOX_RUNTIME_PAGE_SIZE,
} from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';

export { type HermesMailboxRuntimeScope } from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimeScope';
export {
  type HermesMailboxRuntimeAttachment,
  type HermesMailboxRuntimeClonedAsset,
  type HermesMailboxRuntimeDraftOutcome,
  type HermesMailboxRuntimeFolders,
  type HermesMailboxRuntimeMailConnection,
  type HermesMailboxRuntimeNewDraftOutcome,
  type HermesMailboxRuntimeMediaRead,
  type HermesMailboxRuntimeMessage,
  type HermesMailboxRuntimePage,
  type HermesMailboxRuntimePlan,
  type HermesMailboxRuntimeRead,
  type HermesMailboxRuntimeSendOutcome,
} from '@/hermes-mailbox-runtime/types/HermesMailboxRuntimePayload';

export {
  readHermesMailboxRuntimeFailure,
  type HermesMailboxRuntimeFailure,
  type HermesMailboxRuntimeFailureKind,
} from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
export {
  readHermesMailboxRuntimeClonedAsset,
  readHermesMailboxRuntimeDraftOutcome,
  readHermesMailboxRuntimeFolders,
  readHermesMailboxRuntimeMailConnection,
  readHermesMailboxRuntimeMediaRead,
  readHermesMailboxRuntimeMessage,
  readHermesMailboxRuntimeNewDraftOutcome,
  readHermesMailboxRuntimePage,
  readHermesMailboxRuntimePlan,
  readHermesMailboxRuntimeSendOutcome,
} from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
export {
  readHermesMailboxRuntimeMessageAttachments,
  toHermesMailboxAttachment,
} from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeAttachments';
