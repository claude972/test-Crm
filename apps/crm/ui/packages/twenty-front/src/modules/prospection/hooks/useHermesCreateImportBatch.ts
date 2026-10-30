import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_CREATE_IMPORT_BATCH } from '@/prospection/graphql/metadata-mutations/hermesCreateImportBatch';
import { type HermesCallOutcome } from '@/prospection/types/HermesCallOutcome';
import { type HermesCreateImportBatchInput } from '@/prospection/types/HermesImportInput';
import { type HermesCreateImportBatchResult } from '@/prospection/types/HermesOperationResults';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesCreateImportBatchResult } from '@/prospection/utils/readHermesPayload';

export type HermesCreateImportBatchOutcome =
  HermesCallOutcome<HermesCreateImportBatchResult>;

// Stages a batch. No workspace id is sent: the resolver derives it from the
// authenticated session.
export const useHermesCreateImportBatch = () => {
  const [createImportBatch] = useMutation<
    { hermesCreateImportBatch: unknown },
    { input: HermesCreateImportBatchInput }
  >(HERMES_CREATE_IMPORT_BATCH);

  const [outcome, setOutcome] = useState<HermesCreateImportBatchOutcome>({
    kind: 'idle',
  });

  const stageBatch = useCallback(
    async (input: HermesCreateImportBatchInput) => {
      setOutcome({ kind: 'running' });

      try {
        const { data } = await createImportBatch({ variables: { input } });
        const read = readHermesCreateImportBatchResult(
          data?.hermesCreateImportBatch,
        );

        setOutcome(
          read.kind === 'read'
            ? { kind: 'read', result: read.value }
            : { kind: 'unreadable', problem: read.problem },
        );
      } catch (error) {
        setOutcome({ kind: 'failed', failure: readHermesCallFailure(error) });
      }
    },
    [createImportBatch],
  );

  const resetOutcome = useCallback(() => setOutcome({ kind: 'idle' }), []);

  return { outcome, stageBatch, resetOutcome };
};
