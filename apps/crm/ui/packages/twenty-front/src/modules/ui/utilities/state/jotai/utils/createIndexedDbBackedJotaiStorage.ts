import * as idb from 'idb-keyval';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type JotaiSyncStorage } from '@/ui/utilities/state/jotai/types/JotaiSyncStorage';
import { isIndexedDbAvailable } from '@/ui/utilities/state/jotai/utils/isIndexedDbAvailable';
import { logError } from '~/utils/logError';

const INDEXED_DB_STORE_NAME = 'keyval';

type CrossTabMessage<ValueType> =
  | { type: 'set'; key: string; value: ValueType }
  | { type: 'remove'; key: string };

type CrossTabSubscriber<ValueType> = {
  callback: (value: ValueType) => void;
  initialValue: ValueType;
};

type IndexedDbBackedJotaiStorage<ValueType> = {
  storage: JotaiSyncStorage<ValueType>;
  hydrate: () => Promise<void>;
  // Promise<boolean>, not Promise<void>: the outcome is the whole point. A
  // void signature here would silently widen the implementation's boolean at
  // every call site, so an awaiting caller could not tell a real wipe from a
  // failed one.
  clear: () => Promise<boolean>;
};

const createIndexedDbStore = (cacheName: string): idb.UseStore | undefined => {
  if (!isIndexedDbAvailable()) {
    return undefined;
  }

  return idb.createStore(`kovaa-lab-front-${cacheName}`, INDEXED_DB_STORE_NAME);
};

const createCrossTabChannel = (cacheName: string): BroadcastChannel | null => {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }

  try {
    return new BroadcastChannel(`kovaa-lab-front-${cacheName}-sync`);
  } catch (error) {
    logError(error);
    return null;
  }
};

export const createIndexedDbBackedJotaiStorage = <ValueType>(
  cacheName: string,
): IndexedDbBackedJotaiStorage<ValueType> => {
  const memoryMap = new Map<string, ValueType>();
  const idbStore = createIndexedDbStore(cacheName);
  const broadcastChannel = createCrossTabChannel(cacheName);
  const subscribers = new Map<string, Set<CrossTabSubscriber<ValueType>>>();
  let isHydrated = false;

  const persist = (operation: Promise<unknown>): void => {
    void operation.catch(logError);
  };

  if (broadcastChannel !== null) {
    broadcastChannel.onmessage = (
      event: MessageEvent<
        CrossTabMessage<ValueType>[] | CrossTabMessage<ValueType>
      >,
    ) => {
      const messages = Array.isArray(event.data) ? event.data : [event.data];

      for (const message of messages) {
        if (message.type === 'set') {
          memoryMap.set(message.key, message.value);
        } else {
          memoryMap.delete(message.key);
        }
      }

      for (const message of messages) {
        const keySubscribers = subscribers.get(message.key);

        if (!isDefined(keySubscribers)) {
          continue;
        }

        for (const subscriber of keySubscribers) {
          subscriber.callback(
            message.type === 'set' ? message.value : subscriber.initialValue,
          );
        }
      }
    };
  }

  let pendingMessages: CrossTabMessage<ValueType>[] = [];

  const flushPendingMessages = (): void => {
    const messages = pendingMessages;

    pendingMessages = [];

    try {
      broadcastChannel?.postMessage(messages);
    } catch (error) {
      logError(error);
    }
  };

  const broadcast = (message: CrossTabMessage<ValueType>): void => {
    if (!isDefined(broadcastChannel)) {
      return;
    }

    if (pendingMessages.length === 0) {
      queueMicrotask(flushPendingMessages);
    }

    pendingMessages.push(message);
  };

  const storage: JotaiSyncStorage<ValueType> = {
    getItem: (key, initialValue) =>
      memoryMap.has(key) ? (memoryMap.get(key) as ValueType) : initialValue,
    setItem: (key, newValue) => {
      memoryMap.set(key, newValue);
      broadcast({ type: 'set', key, value: newValue });

      if (isDefined(idbStore)) {
        persist(idb.set(key, newValue, idbStore));
      }
    },
    removeItem: (key) => {
      memoryMap.delete(key);
      broadcast({ type: 'remove', key });

      if (isDefined(idbStore)) {
        persist(idb.del(key, idbStore));
      }
    },
    subscribe: (key, callback, initialValue) => {
      const keySubscribers = subscribers.get(key) ?? new Set();
      const subscriber: CrossTabSubscriber<ValueType> = {
        callback,
        initialValue,
      };
      keySubscribers.add(subscriber);
      subscribers.set(key, keySubscribers);

      return () => {
        keySubscribers.delete(subscriber);

        if (keySubscribers.size === 0) {
          subscribers.delete(key);
        }
      };
    },
  };

  const hydrate = async (): Promise<void> => {
    if (isHydrated || !isDefined(idbStore)) {
      isHydrated = true;
      return;
    }

    try {
      const persistedEntries = await idb.entries<string, ValueType>(idbStore);

      for (const [key, value] of persistedEntries) {
        memoryMap.set(key, value);
      }
    } catch (error) {
      logError(error);
    }

    isHydrated = true;
  };

  // Resolves true only when the persisted copy is really gone. It used to
  // swallow the failure and always resolve, so a caller awaiting it learned
  // nothing — and a sign-out purge cannot be proven by a promise that cannot
  // fail. No store at all means there is nothing persisted to clear.
  const clear = async (): Promise<boolean> => {
    memoryMap.clear();

    if (!isDefined(idbStore)) {
      return true;
    }

    try {
      await idb.clear(idbStore);

      return true;
    } catch (error) {
      logError(error);

      return false;
    }
  };

  return { storage, hydrate, clear };
};
