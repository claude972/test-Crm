import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_MESSAGING_CONNECTIONS } from '@/messaging-inbox/graphql/metadata-queries/hermesMessagingConnections';
import { type MessagingInboxChannel } from '@/messaging-inbox/types/MessagingInboxChannel';
import { type MessagingInboxConnectionRead } from '@/messaging-inbox/types/MessagingInboxConnection';
import { readMessagingInboxConnections } from '@/messaging-inbox/utils/readMessagingInboxPayload';

export type MessagingInboxConnections = {
  readChannel: (channel: MessagingInboxChannel) => MessagingInboxConnectionRead;
  refresh: () => void;
  isRefreshing: boolean;
};

// The configuration state of the channels, read once per screen.
//
// The three answers are kept apart on purpose:
// - the query failed            → 'unknown'. It says nothing about setup, so
//                                 the screen must not read it as not set up.
// - the query answered, channel
//   absent from the list        → 'absent', which the contract defines as
//                                 NOT_CONFIGURED. No synthetic connection is
//                                 built for it.
// - the channel is listed       → 'reported', with its own state, and only
//                                 AVAILABLE is provider-confirmed.
export const useMessagingInboxConnections = (): MessagingInboxConnections => {
  const { data, loading, error, refetch } = useQuery<{
    hermesMessagingConnections: unknown;
  }>(HERMES_MESSAGING_CONNECTIONS, {
    // A configuration state is a point-in-time fact about a remote provider.
    // A cached answer would keep showing a channel as usable after it stopped
    // being so.
    fetchPolicy: 'network-only',
    // Without this, a manual refresh never reports that it is running.
    notifyOnNetworkStatusChange: true,
  });

  const read = useMemo(
    () => readMessagingInboxConnections(data?.hermesMessagingConnections),
    [data],
  );

  const readChannel = useCallback(
    (channel: MessagingInboxChannel): MessagingInboxConnectionRead => {
      // Loading first, so a refresh after a failure reads as in progress
      // rather than keeping the previous answer on screen.
      if (loading) {
        return { kind: 'loading' };
      }

      if (isDefined(error) || read.kind === 'unreadable') {
        return { kind: 'unknown' };
      }

      const connection = read.value.find(
        (entry) => entry.channel === channel,
      );

      return isDefined(connection)
        ? { kind: 'reported', connection }
        : { kind: 'absent' };
    },
    [error, loading, read],
  );

  const refresh = useCallback(() => {
    // refetch rejects when the refresh fails, and an unhandled rejection would
    // land in the console instead of on the screen. The failure is already
    // reported where it belongs: the query's own error drives the unknown
    // state above.
    refetch().catch(() => {});
  }, [refetch]);

  return { readChannel, refresh, isRefreshing: loading };
};
