import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { HERMES_IMPORT_BATCHES } from '@/prospection/graphql/metadata-queries/hermesImportBatches';
import {
  type HermesImportState,
  type HermesPayloadProblem,
} from '@/prospection/types/HermesImportState';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesImportState } from '@/prospection/utils/readHermesPayload';

// 'read' is the only status that carries batches. 'unreadable' covers both a
// payload that does not match the contract and an operation the deployed
// schema does not expose yet — in both cases the screen shows an unknown
// state, never an empty reception.
export type HermesStateStatus = 'loading' | 'read' | 'denied' | 'unreadable';

type HermesImportBatchesResult = {
  status: HermesStateStatus;
  state: HermesImportState | null;
  problem: HermesPayloadProblem | null;
  // Server wording for the folded diagnostic, if there was one.
  failureMessage: string | null;
  isRefreshing: boolean;
  refetch: () => void;
};

export const useHermesImportBatches = (): HermesImportBatchesResult => {
  const { data, loading, error, refetch } = useQuery<{
    hermesImportBatches: unknown;
  }>(HERMES_IMPORT_BATCHES, {
    // The resolver derives the workspace and the permissions from the session
    // on every request, so a cached answer could show an access this session
    // no longer has.
    fetchPolicy: 'network-only',
  });

  const read = useMemo(
    () => readHermesImportState(data?.hermesImportBatches),
    [data],
  );

  const failure = readHermesCallFailure(error);

  const status: HermesStateStatus =
    read.kind === 'read'
      ? 'read'
      : failure.kind === 'denied'
        ? 'denied'
        : loading
          ? 'loading'
          : 'unreadable';

  return {
    status,
    state: read.kind === 'read' ? read.value : null,
    problem: read.kind === 'unreadable' ? read.problem : null,
    failureMessage: failure.message,
    isRefreshing: loading,
    refetch: () => {
      void refetch();
    },
  };
};
