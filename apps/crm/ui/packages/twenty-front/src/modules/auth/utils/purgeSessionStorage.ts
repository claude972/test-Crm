import { clearSessionLocalStorageKeys } from '@/auth/utils/clearSessionLocalStorageKeys';
import { getMetadataStoreKeys } from '@/auth/utils/clearAllSessionLocalStorageKeys';
import { safeRemoveLocalStorageItems } from '@/auth/utils/safeRemoveLocalStorageItems';
import { clearMetadataStoreStorage } from '@/metadata-store/storage/metadataStoreStorage';

// A hung IndexedDB must not trap someone on the way out. Signing out matters
// more than a confirmed wipe, so the wait is bounded and the caller is told
// the truth about what happened rather than being handed a silent success.
const PURGE_TIMEOUT_IN_MS = 2000;

export type SessionStoragePurgeOutcome =
  | 'cleared'
  | 'not-confirmed'
  | 'failed';

// The awaitable sign-out purge. clearAllSessionLocalStorageKeys stays as it is
// for resetJotaiStore; this is the path that has to finish BEFORE navigating,
// because window.location.assign can interrupt an in-flight IndexedDB
// transaction and leave the workspace schema on the device.
export const purgeSessionStorage =
  async (): Promise<SessionStoragePurgeOutcome> => {
    // Synchronous and reliable, so it happens first and is never at the mercy
    // of the timeout below.
    clearSessionLocalStorageKeys();
    safeRemoveLocalStorageItems(getMetadataStoreKeys());

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<SessionStoragePurgeOutcome>((resolve) => {
      timeoutId = setTimeout(
        () => resolve('not-confirmed'),
        PURGE_TIMEOUT_IN_MS,
      );
    });

    const purge = clearMetadataStoreStorage().then(
      (isCleared): SessionStoragePurgeOutcome =>
        isCleared ? 'cleared' : 'failed',
    );

    try {
      return await Promise.race([purge, timeout]);
    } finally {
      // Cleared on every path, including the timeout's own win: a pending
      // timer would otherwise keep the event loop busy after sign-out and,
      // under a fake-timer test, leak into the next case.
      clearTimeout(timeoutId);
    }
  };
