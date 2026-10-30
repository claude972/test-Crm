import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  HERMES_MAILBOX_RUNTIME_MAX_PAGES,
  HERMES_MAILBOX_RUNTIME_PAGE_SIZE,
} from '@/hermes-mailbox-runtime/constants/HermesMailboxRuntimeContract';
import { HERMES_MAIL_MESSAGES_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailMessagesV4';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import { readHermesMailboxRuntimePage } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';
import { type HermesMailboxThreadSummary } from '@/hermes-mailbox-ui/types/HermesMailboxThread';

export type HermesMailboxRuntimeMessagesRead = {
  load: HermesMailboxLoad<HermesMailboxThreadSummary[]>;
  // The validity every UID in this list is only addressable with. Null until
  // a page came back; a read attempted without it is refused rather than sent
  // with a validity this client made up.
  uidValidity: string | null;
  nextCursor: string | null;
  isLoadingMore: boolean;
  hasReachedPageLimit: boolean;
  // Rows the client had to drop, counted rather than hidden.
  unreadableItemCount: number;
  reload: () => void;
  loadMore: () => void;
};

type InternalState = {
  load: HermesMailboxLoad<HermesMailboxThreadSummary[]>;
  uidValidity: string | null;
  nextCursor: string | null;
  isLoadingMore: boolean;
  unreadableItemCount: number;
  pageCount: number;
};

const INITIAL_STATE: InternalState = {
  load: { kind: 'loading' },
  uidValidity: null,
  nextCursor: null,
  isLoadingMore: false,
  unreadableItemCount: 0,
  pageCount: 0,
};

// One folder's messages, newest first.
//
// The server paginates on UID and binds every cursor to the folder and to the
// mailbox's UIDVALIDITY. Two things follow, and both are honoured here: the
// cursor is carried back exactly as it arrived, and a validity that no longer
// matches is reported as an expired page — never as an empty folder.
//
// Callers mount this under a `key` tied to the folder, so changing folder
// remounts and starts clean instead of merging two folders into one list.
export const useHermesMailboxRuntimeMessages = ({
  folder,
}: {
  folder: string | null;
}): HermesMailboxRuntimeMessagesRead => {
  const client = useApolloClient();
  const [state, setState] = useState<InternalState>(INITIAL_STATE);

  // Every load carries its own number. An answer that lands after a newer load
  // started is dropped rather than merged.
  const requestRef = useRef(0);

  // Read by loadMore, which needs the current cursor without making the
  // callback change identity on every page.
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runLoad = useCallback(
    async (mode: 'first' | 'more', cursor: string | null) => {
      if (folder === null) {
        return;
      }

      const requestId = requestRef.current + 1;

      requestRef.current = requestId;

      setState((current) =>
        mode === 'first'
          ? { ...INITIAL_STATE }
          : { ...current, isLoadingMore: true },
      );

      try {
        const { data } = await client.query<Record<string, unknown>>({
          query: HERMES_MAIL_MESSAGES_V4,
          variables: {
            input: {
              folder,
              limit: HERMES_MAILBOX_RUNTIME_PAGE_SIZE,
              // Omitted rather than sent as null on the first page: the
              // contract marks the cursor optional, and an explicit null is a
              // different value from an absent field.
              ...(cursor === null ? {} : { cursor }),
            },
          },
          // A point-in-time read of a remote folder. A cached answer would
          // keep showing a message as unread after it was opened elsewhere.
          fetchPolicy: 'no-cache',
        });

        if (requestRef.current !== requestId) {
          return;
        }

        const read = readHermesMailboxRuntimePage(data?.hermesMailMessagesV4);

        if (read.kind === 'notConfigured') {
          setState({ ...INITIAL_STATE, load: { kind: 'notConfigured' } });

          return;
        }

        if (read.kind === 'unreadable') {
          setState((current) =>
            mode === 'first'
              ? {
                  ...INITIAL_STATE,
                  load: {
                    kind: 'unreadable',
                    problem: read.problem,
                    message: null,
                  },
                }
              : { ...current, isLoadingMore: false },
          );

          return;
        }

        setState((current) => {
          // The mailbox was reset between two pages. The rows already on
          // screen belong to UIDs that no longer exist, so the list is
          // restarted rather than extended.
          if (
            mode === 'more' &&
            current.uidValidity !== null &&
            current.uidValidity !== read.value.uidValidity
          ) {
            return {
              ...INITIAL_STATE,
              load: { kind: 'pageExpired', message: null },
            };
          }

          const previous =
            mode === 'first' || current.load.kind !== 'ready'
              ? []
              : current.load.value;

          return {
            load: {
              kind: 'ready',
              value: [...previous, ...read.value.summaries],
            },
            uidValidity: read.value.uidValidity,
            nextCursor: read.value.nextCursor,
            isLoadingMore: false,
            unreadableItemCount:
              (mode === 'first' ? 0 : current.unreadableItemCount) +
              read.value.unreadableItemCount,
            pageCount: mode === 'first' ? 1 : current.pageCount + 1,
          };
        });
      } catch (error) {
        if (requestRef.current !== requestId) {
          return;
        }

        const failure = readHermesMailboxRuntimeFailure(error);

        setState((current) => {
          if (failure.kind === 'notConfigured') {
            return { ...INITIAL_STATE, load: { kind: 'notConfigured' } };
          }

          // An expired cursor or a changed UIDVALIDITY is an explicit answer:
          // start the list again. Keeping the stale rows would be worse than
          // saying so.
          if (failure.kind === 'expired') {
            return {
              ...INITIAL_STATE,
              load: { kind: 'pageExpired', message: failure.message },
            };
          }

          if (mode === 'more') {
            return { ...current, isLoadingMore: false };
          }

          return {
            ...INITIAL_STATE,
            load:
              failure.kind === 'denied'
                ? { kind: 'denied', message: failure.message }
                : {
                    kind: 'unreadable',
                    problem: 'missing',
                    message: failure.message,
                  },
          };
        });
      }
    },
    [client, folder],
  );

  useEffect(() => {
    if (folder === null) {
      return;
    }

    void runLoad('first', null);
  }, [folder, runLoad]);

  const reload = useCallback(() => {
    void runLoad('first', null);
  }, [runLoad]);

  const loadMore = useCallback(() => {
    const current = stateRef.current;

    // A client bound, said as one: the cursor is opaque and the server may
    // keep handing one back.
    if (
      current.nextCursor === null ||
      current.pageCount >= HERMES_MAILBOX_RUNTIME_MAX_PAGES
    ) {
      return;
    }

    void runLoad('more', current.nextCursor);
  }, [runLoad]);

  return {
    load: state.load,
    uidValidity: state.uidValidity,
    nextCursor: state.nextCursor,
    isLoadingMore: state.isLoadingMore,
    hasReachedPageLimit: state.pageCount >= HERMES_MAILBOX_RUNTIME_MAX_PAGES,
    unreadableItemCount: state.unreadableItemCount,
    reload,
    loadMore,
  };
};
