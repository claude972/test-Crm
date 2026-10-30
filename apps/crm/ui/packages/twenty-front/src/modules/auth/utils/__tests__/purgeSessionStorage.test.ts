import { clearSessionLocalStorageKeys } from '@/auth/utils/clearSessionLocalStorageKeys';
import { getMetadataStoreKeys } from '@/auth/utils/clearAllSessionLocalStorageKeys';
import { purgeSessionStorage } from '@/auth/utils/purgeSessionStorage';
import { safeRemoveLocalStorageItems } from '@/auth/utils/safeRemoveLocalStorageItems';
import { clearMetadataStoreStorage } from '@/metadata-store/storage/metadataStoreStorage';

jest.mock('@/auth/utils/clearSessionLocalStorageKeys');
jest.mock('@/auth/utils/safeRemoveLocalStorageItems');
jest.mock('@/metadata-store/storage/metadataStoreStorage', () => ({
  clearMetadataStoreStorage: jest.fn(),
}));

const mockedClearSessionLocalStorageKeys = jest.mocked(
  clearSessionLocalStorageKeys,
);
const mockedSafeRemoveLocalStorageItems = jest.mocked(
  safeRemoveLocalStorageItems,
);
const mockedClearMetadataStoreStorage = jest.mocked(clearMetadataStoreStorage);

describe('purgeSessionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports cleared when the persisted store confirms the wipe', async () => {
    mockedClearMetadataStoreStorage.mockResolvedValue(true);

    await expect(purgeSessionStorage()).resolves.toBe('cleared');
  });

  it('reports failed when the store answers that it could not clear', async () => {
    mockedClearMetadataStoreStorage.mockResolvedValue(false);

    // The distinction that matters: a refused wipe is not a success, and it is
    // not a timeout either. Collapsing the two would hide a device that keeps
    // the workspace schema after every sign-out.
    await expect(purgeSessionStorage()).resolves.toBe('failed');
  });

  it('reports not-confirmed, rather than hanging, when the database never answers', async () => {
    jest.useFakeTimers();
    mockedClearMetadataStoreStorage.mockReturnValue(
      new Promise<boolean>(() => {}),
    );

    const outcome = purgeSessionStorage();

    await jest.advanceTimersByTimeAsync(2000);

    await expect(outcome).resolves.toBe('not-confirmed');
  });

  it('removes the synchronous localStorage keys even when the database hangs', async () => {
    jest.useFakeTimers();
    mockedClearMetadataStoreStorage.mockReturnValue(
      new Promise<boolean>(() => {}),
    );

    const outcome = purgeSessionStorage();

    // Asserted before the race resolves: these two must not be waiting on
    // IndexedDB, because they are the part of the purge that always works.
    expect(mockedClearSessionLocalStorageKeys).toHaveBeenCalledTimes(1);
    expect(mockedSafeRemoveLocalStorageItems).toHaveBeenCalledWith(
      getMetadataStoreKeys(),
    );

    await jest.advanceTimersByTimeAsync(2000);
    await outcome;
  });

  it('leaves no pending timer behind once the store answers in time', async () => {
    jest.useFakeTimers();
    mockedClearMetadataStoreStorage.mockResolvedValue(true);

    await expect(purgeSessionStorage()).resolves.toBe('cleared');

    // Without the clearTimeout, the 2s timer would still be queued here and
    // would keep firing after the user has already left.
    expect(jest.getTimerCount()).toBe(0);
  });
});
