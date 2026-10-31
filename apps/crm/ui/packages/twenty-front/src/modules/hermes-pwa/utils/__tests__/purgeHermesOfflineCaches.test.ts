import { purgeHermesOfflineCaches } from '@/hermes-pwa/utils/purgeHermesOfflineCaches';

type CacheStorageStub = {
  keys: jest.Mock;
  delete: jest.Mock;
};

const setCacheStorage = (stub: CacheStorageStub | undefined) => {
  if (stub === undefined) {
    // @ts-expect-error jsdom has no CacheStorage; the production code must
    // survive exactly this situation.
    delete globalThis.caches;

    return;
  }

  Object.defineProperty(globalThis, 'caches', {
    value: stub,
    configurable: true,
    writable: true,
  });
};

const createCacheStorage = (names: string[]): CacheStorageStub => ({
  keys: jest.fn().mockResolvedValue(names),
  delete: jest.fn().mockResolvedValue(true),
});

describe('purgeHermesOfflineCaches', () => {
  afterEach(() => {
    setCacheStorage(undefined);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('reports nothing-to-clear where CacheStorage does not exist', async () => {
    setCacheStorage(undefined);

    // Private browsing, blocked storage and a non-secure context all land
    // here. Nothing could have been written, so nothing was left behind, and
    // a sign-out must not fail over it.
    await expect(purgeHermesOfflineCaches()).resolves.toBe('nothing-to-clear');
  });

  it('reports nothing-to-clear when CacheStorage is empty', async () => {
    setCacheStorage(createCacheStorage([]));

    await expect(purgeHermesOfflineCaches()).resolves.toBe('nothing-to-clear');
  });

  it('deletes every cache on the origin, not only the Hermes ones', async () => {
    const storage = createCacheStorage([
      'hermes-offline-v1',
      'hermes-offline-v0',
      'un-cache-herite-de-quelqu-un-d-autre',
    ]);
    setCacheStorage(storage);

    await expect(purgeHermesOfflineCaches()).resolves.toBe('cleared');

    // The point of the belt: a private response left in CacheStorage by an
    // earlier worker, or by any other code on this origin, must not outlive
    // the session on this device either.
    expect(storage.delete.mock.calls.map(([name]) => name)).toEqual([
      'hermes-offline-v1',
      'hermes-offline-v0',
      'un-cache-herite-de-quelqu-un-d-autre',
    ]);
  });

  it('reports not-confirmed when a delete answers that the cache was absent', async () => {
    const storage = createCacheStorage(['hermes-offline-v1', 'autre']);
    storage.delete
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    setCacheStorage(storage);

    // `false` means "no such cache". Reporting that as cleared would claim a
    // confirmed wipe we did not get.
    await expect(purgeHermesOfflineCaches()).resolves.toBe('not-confirmed');
  });

  it('reports failed, and does not throw, when the browser refuses storage access', async () => {
    const storage = createCacheStorage(['hermes-offline-v1']);
    storage.keys.mockRejectedValue(new Error('storage access denied'));
    setCacheStorage(storage);

    // Must not reject: a rejection here would propagate into the sign-out
    // path and could leave someone unable to sign out at all.
    await expect(purgeHermesOfflineCaches()).resolves.toBe('failed');
  });

  it('reports not-confirmed, rather than hanging, when CacheStorage never answers', async () => {
    jest.useFakeTimers();
    const storage = createCacheStorage(['hermes-offline-v1']);
    storage.keys.mockReturnValue(new Promise<string[]>(() => {}));
    setCacheStorage(storage);

    const outcome = purgeHermesOfflineCaches();

    await jest.advanceTimersByTimeAsync(1000);

    await expect(outcome).resolves.toBe('not-confirmed');
  });

  it('leaves no pending timer behind once the purge answers in time', async () => {
    jest.useFakeTimers();
    setCacheStorage(createCacheStorage(['hermes-offline-v1']));

    await expect(purgeHermesOfflineCaches()).resolves.toBe('cleared');

    expect(jest.getTimerCount()).toBe(0);
  });
});
