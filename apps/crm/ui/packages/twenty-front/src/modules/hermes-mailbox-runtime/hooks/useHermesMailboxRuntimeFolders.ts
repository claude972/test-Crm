import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_MAIL_FOLDERS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesMailFoldersV4';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import { readHermesMailboxRuntimeFolders } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxProviderState } from '@/hermes-mailbox-ui/components/HermesMailbox';
import { type HermesMailboxFolder } from '@/hermes-mailbox-ui/types/HermesMailboxFolder';
import { type HermesMailboxLoad } from '@/hermes-mailbox-ui/types/HermesMailboxLoad';

export type HermesMailboxRuntimeFoldersRead = {
  load: HermesMailboxLoad<HermesMailboxFolder[]>;
  // Whether a mailbox is connected at all. This is the one answer the whole
  // screen turns on, and it comes from the server's own `state` field — never
  // from an empty folder list.
  provider: HermesMailboxProviderState;
  reload: () => void;
};

// The mailbox's folders, read once per mount.
//
// No polling and no subscription: nothing here may suggest a live feed the
// contract does not provide. A refresh is a button somebody pressed.
export const useHermesMailboxRuntimeFolders =
  (): HermesMailboxRuntimeFoldersRead => {
    const { data, loading, error, refetch } = useQuery<{
      hermesMailFoldersV4: unknown;
    }>(HERMES_MAIL_FOLDERS_V4, {
      // A point-in-time read of a remote mailbox. A cached answer would keep
      // showing folders from before the provider was disconnected.
      fetchPolicy: 'no-cache',
      notifyOnNetworkStatusChange: true,
    });

    const { load, provider } = useMemo<{
      load: HermesMailboxLoad<HermesMailboxFolder[]>;
      provider: HermesMailboxProviderState;
    }>(() => {
      if (loading) {
        // Not yet an answer about the configuration either, so the three
        // panels show their own loading note rather than the unconnected
        // screen taking over.
        return { load: { kind: 'loading' }, provider: { kind: 'configured' } };
      }

      if (isDefined(error)) {
        const failure = readHermesMailboxRuntimeFailure(error);

        if (failure.kind === 'notConfigured') {
          return {
            load: { kind: 'notConfigured' },
            provider: { kind: 'notConfigured', message: failure.message },
          };
        }

        if (failure.kind === 'denied') {
          return {
            load: { kind: 'denied', message: failure.message },
            provider: { kind: 'configured' },
          };
        }

        if (failure.kind === 'expired') {
          return {
            load: { kind: 'pageExpired', message: failure.message },
            provider: { kind: 'configured' },
          };
        }

        // A failed read says nothing about the setup, so it must not be shown
        // as an unconnected mailbox.
        return {
          load: {
            kind: 'unreadable',
            problem: 'missing',
            message: failure.message,
          },
          provider: { kind: 'configured' },
        };
      }

      const read = readHermesMailboxRuntimeFolders(data?.hermesMailFoldersV4);

      if (read.kind === 'notConfigured') {
        return {
          load: { kind: 'notConfigured' },
          provider: { kind: 'notConfigured', message: null },
        };
      }

      if (read.kind === 'unreadable') {
        return {
          load: { kind: 'unreadable', problem: read.problem, message: null },
          provider: { kind: 'configured' },
        };
      }

      return {
        load: { kind: 'ready', value: read.value.folders },
        provider: { kind: 'configured' },
      };
    }, [data, error, loading]);

    const reload = useCallback(() => {
      // refetch rejects on failure and an unhandled rejection would land in
      // the console instead of on the screen. The query's own error already
      // drives the load above.
      refetch().catch(() => {});
    }, [refetch]);

    return { load, provider, reload };
  };
