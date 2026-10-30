import { type DocumentNode } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MESSAGING_INBOX_MAX_PAGES } from '@/messaging-inbox/constants/MessagingInboxContract';
import {
  type MessagingInboxPage,
  type MessagingInboxPayloadProblem,
  type MessagingInboxPayloadRead,
} from '@/messaging-inbox/types/MessagingInboxPage';
import { type MessagingInboxReadStatus } from '@/messaging-inbox/types/MessagingInboxReadStatus';
import {
  type MessagingInboxCallFailure,
  readMessagingInboxCallFailure,
} from '@/messaging-inbox/utils/readMessagingInboxCallFailure';

type MessagingInboxCursorListParams<TItem> = {
  query: DocumentNode;
  // The operation's field name in the answer, e.g. 'hermesInboxConversations'.
  responseField: string;
  buildVariables: (cursor: string | null) => Record<string, unknown>;
  readPage: (
    value: unknown,
  ) => MessagingInboxPayloadRead<MessagingInboxPage<TItem>>;
};

export type MessagingInboxCursorList<TItem> = {
  status: MessagingInboxReadStatus;
  items: TItem[];
  // Present means the server says there is more. Absent means it did not say
  // there is more — not that the list is complete, which the contract never
  // states either way.
  nextCursor: string | null;
  // Entries the client had to drop, counted rather than hidden.
  unreadableItemCount: number;
  // Why the first read failed, when it did.
  problem: MessagingInboxPayloadProblem | null;
  failureMessage: string | null;
  // A later page is reported separately: the pages already on screen are
  // still real, so a failed "load more" must not blank them.
  isLoadingMore: boolean;
  loadMoreFailure: MessagingInboxCallFailure | null;
  loadMoreProblem: MessagingInboxPayloadProblem | null;
  hasReachedPageLimit: boolean;
  reload: () => void;
  loadMore: (cursor: string) => void;
};

type InternalState<TItem> = {
  status: MessagingInboxReadStatus;
  items: TItem[];
  nextCursor: string | null;
  unreadableItemCount: number;
  problem: MessagingInboxPayloadProblem | null;
  failureMessage: string | null;
  isLoadingMore: boolean;
  loadMoreFailure: MessagingInboxCallFailure | null;
  loadMoreProblem: MessagingInboxPayloadProblem | null;
  pageCount: number;
};

const INITIAL_STATE = {
  status: 'loading' as MessagingInboxReadStatus,
  nextCursor: null,
  unreadableItemCount: 0,
  problem: null,
  failureMessage: null,
  isLoadingMore: false,
  loadMoreFailure: null,
  loadMoreProblem: null,
  pageCount: 0,
};

// One cursor-paginated inbox list, loaded explicitly.
//
// There is no polling and no subscription: nothing on this screen may suggest
// a live feed the contract does not provide. The first page loads on mount,
// and every further page or refresh comes from a button the operator pressed.
//
// Callers mount this hook under a `key` tied to their scope (the channel, the
// conversation). A scope change therefore remounts and starts clean, instead
// of merging the answers of two different scopes into one list.
export const useMessagingInboxCursorList = <TItem>({
  query,
  responseField,
  buildVariables,
  readPage,
}: MessagingInboxCursorListParams<TItem>): MessagingInboxCursorList<TItem> => {
  const client = useApolloClient();

  const [state, setState] = useState<InternalState<TItem>>({
    ...INITIAL_STATE,
    items: [],
  });

  // The three callbacks are reached through refs so an inline arrow at the
  // call site cannot restart the load on every render.
  const buildVariablesRef = useRef(buildVariables);
  const readPageRef = useRef(readPage);
  const queryRef = useRef(query);
  const responseFieldRef = useRef(responseField);

  useEffect(() => {
    buildVariablesRef.current = buildVariables;
    readPageRef.current = readPage;
    queryRef.current = query;
    responseFieldRef.current = responseField;
  }, [buildVariables, readPage, query, responseField]);

  // Every load carries its own number. An answer that comes back after a
  // newer load started is dropped rather than merged, so a slow first page
  // cannot overwrite a refresh the operator triggered after it.
  const requestRef = useRef(0);

  const runLoad = useCallback(
    async (mode: 'first' | 'more', cursor: string | null) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      setState((current) =>
        mode === 'first'
          ? {
              ...current,
              status: 'loading',
              problem: null,
              failureMessage: null,
              isLoadingMore: false,
              loadMoreFailure: null,
              loadMoreProblem: null,
            }
          : {
              ...current,
              isLoadingMore: true,
              loadMoreFailure: null,
              loadMoreProblem: null,
            },
      );

      try {
        const { data } = await client.query<Record<string, unknown>>({
          query: queryRef.current,
          variables: buildVariablesRef.current(cursor),
          // A point-in-time read of a remote inbox. A cached answer would keep
          // showing a thread as it was before the last reply left.
          fetchPolicy: 'no-cache',
        });

        if (requestRef.current !== requestId) {
          return;
        }

        const read = readPageRef.current(data?.[responseFieldRef.current]);

        if (read.kind === 'unreadable') {
          setState((current) =>
            mode === 'first'
              ? {
                  ...current,
                  status: 'unreadable',
                  items: [],
                  nextCursor: null,
                  unreadableItemCount: 0,
                  problem: read.problem,
                  isLoadingMore: false,
                  pageCount: 0,
                }
              : {
                  ...current,
                  isLoadingMore: false,
                  loadMoreProblem: read.problem,
                },
          );

          return;
        }

        setState((current) => ({
          status: 'read',
          items:
            mode === 'first'
              ? read.value.items
              : [...current.items, ...read.value.items],
          nextCursor: read.value.nextCursor,
          unreadableItemCount:
            mode === 'first'
              ? read.value.unreadableItemCount
              : current.unreadableItemCount + read.value.unreadableItemCount,
          problem: null,
          failureMessage: null,
          isLoadingMore: false,
          loadMoreFailure: null,
          loadMoreProblem: null,
          pageCount: mode === 'first' ? 1 : current.pageCount + 1,
        }));
      } catch (error) {
        if (requestRef.current !== requestId) {
          return;
        }

        const failure = readMessagingInboxCallFailure(error);

        setState((current) =>
          mode === 'first'
            ? {
                ...current,
                // A refusal is an authorisation answer, not a technical
                // failure, and the screen says so instead of offering a retry.
                status: failure.kind === 'denied' ? 'denied' : 'unreadable',
                items: [],
                nextCursor: null,
                unreadableItemCount: 0,
                problem: null,
                failureMessage: failure.message,
                isLoadingMore: false,
                pageCount: 0,
              }
            : {
                ...current,
                isLoadingMore: false,
                loadMoreFailure: failure,
              },
        );
      }
    },
    [client],
  );

  useEffect(() => {
    void runLoad('first', null);
  }, [runLoad]);

  const reload = useCallback(() => {
    void runLoad('first', null);
  }, [runLoad]);

  const loadMore = useCallback(
    (cursor: string) => {
      void runLoad('more', cursor);
    },
    [runLoad],
  );

  return {
    status: state.status,
    items: state.items,
    nextCursor: state.nextCursor,
    unreadableItemCount: state.unreadableItemCount,
    problem: state.problem,
    failureMessage: state.failureMessage,
    isLoadingMore: state.isLoadingMore,
    loadMoreFailure: state.loadMoreFailure,
    loadMoreProblem: state.loadMoreProblem,
    hasReachedPageLimit: state.pageCount >= MESSAGING_INBOX_MAX_PAGES,
    reload,
    loadMore,
  };
};
