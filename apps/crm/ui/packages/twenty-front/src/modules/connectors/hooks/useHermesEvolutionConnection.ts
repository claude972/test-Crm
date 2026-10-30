import { useQuery } from '@apollo/client/react';
import { useCallback } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_EVOLUTION_CONNECTION } from '@/connectors/graphql/metadata-queries/hermesEvolutionConnection';
import { type ConnectorReadState } from '@/connectors/types/ConnectorReadState';
import { type HermesEvolutionConnection } from '@/connectors/types/HermesEvolutionConnection';
import { isHermesEvolutionConnectionStatus } from '@/connectors/types/HermesEvolutionConnectionStatus';

// hermesEvolutionConnection is not in the generated schema yet, so nothing
// type-checks the payload. status is read as a plain string and admitted only
// once it matches the published set.
type RawHermesEvolutionConnection = Omit<HermesEvolutionConnection, 'status'> & {
  status: string;
};

type HermesEvolutionConnectionQueryData = {
  hermesEvolutionConnection: RawHermesEvolutionConnection | null;
};

export type UseHermesEvolutionConnectionResult = {
  state: ConnectorReadState;
  refresh: () => void;
  isRefreshing: boolean;
};

export const toConnectorReadState = ({
  connection,
  isLoading,
  hasError,
}: {
  connection: RawHermesEvolutionConnection | null | undefined;
  isLoading: boolean;
  hasError: boolean;
}): ConnectorReadState => {
  // Loading is tested first so a retry after a failure reads as in progress
  // rather than keeping the previous failure on screen.
  if (isLoading) {
    return { kind: 'loading' };
  }

  // A read that failed tells us nothing about the connector. Anything other
  // than 'unknown' here would invent a state the server never sent.
  if (hasError) {
    return { kind: 'unknown' };
  }

  if (!isDefined(connection)) {
    return { kind: 'absent' };
  }

  // Bound to a local const first: narrowing a plain binding needs no
  // assumption about how far a guard reaches into a property path.
  const { status } = connection;

  if (!isHermesEvolutionConnectionStatus(status)) {
    return { kind: 'unknown' };
  }

  return { kind: 'reported', connection: { ...connection, status } };
};

export const useHermesEvolutionConnection =
  (): UseHermesEvolutionConnectionResult => {
    const { data, loading, error, refetch } =
      useQuery<HermesEvolutionConnectionQueryData>(
        HERMES_EVOLUTION_CONNECTION,
        {
          // A connector status is a point-in-time fact about a remote
          // provider. A cached answer would keep showing a line as open after
          // it dropped.
          fetchPolicy: 'network-only',
          // Without this, a manual refresh never reports that it is running.
          notifyOnNetworkStatusChange: true,
        },
      );

    const refresh = useCallback(() => {
      void refetch();
    }, [refetch]);

    return {
      state: toConnectorReadState({
        connection: data?.hermesEvolutionConnection,
        isLoading: loading,
        hasError: isDefined(error),
      }),
      refresh,
      isRefreshing: loading,
    };
  };
