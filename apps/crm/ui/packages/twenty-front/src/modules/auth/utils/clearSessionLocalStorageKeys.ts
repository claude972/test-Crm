import { safeRemoveLocalStorageItems } from '@/auth/utils/safeRemoveLocalStorageItems';

const SESSION_KEYS_TO_CLEAR = [
  // Clear values persisted before this now-unused state was removed.
  'lastVisitedObjectMetadataItemIdState',
  'lastVisitedViewPerObjectMetadataItemState',
  'ai/agentChatDraftsByThreadIdState',
  'companyEnrichmentState',
  'personEnrichmentState',
  'locale',
  'currentUserState',
  'currentWorkspaceState',
  'currentWorkspaceMemberState',
  'currentUserWorkspaceState',
];

// Keys a build no longer writes but a device may still hold. Swept by prefix
// because the mailbox draft store was scoped per account, so its key names are
// not knowable here.
const STALE_KEY_PREFIXES = ['hermes.mailbox.draftIdentities.'];

const readStaleKeys = (): string[] => {
  try {
    return Object.keys(window.localStorage).filter((key) =>
      STALE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)),
    );
  } catch {
    return [];
  }
};

export const clearSessionLocalStorageKeys = () => {
  safeRemoveLocalStorageItems([...SESSION_KEYS_TO_CLEAR, ...readStaleKeys()]);
};
