import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_QUALIFY_IMPORT_ROWS } from '@/prospection/graphql/metadata-mutations/hermesQualifyImportRows';
import { type HermesCallOutcome } from '@/prospection/types/HermesCallOutcome';
import { type HermesQualifyImportRowsInput } from '@/prospection/types/HermesImportInput';
import { type HermesQualifyImportRowsResult } from '@/prospection/types/HermesOperationResults';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesQualifyImportRowsResult } from '@/prospection/utils/readHermesPayload';

export type HermesQualifyImportRowsOutcome =
  HermesCallOutcome<HermesQualifyImportRowsResult>;

export const useHermesQualifyImportRows = () => {
  const [qualifyImportRows] = useMutation<
    { hermesQualifyImportRows: unknown },
    { input: HermesQualifyImportRowsInput }
  >(HERMES_QUALIFY_IMPORT_ROWS);

  const [outcome, setOutcome] = useState<HermesQualifyImportRowsOutcome>({
    kind: 'idle',
  });

  const qualifyRows = useCallback(
    async (input: HermesQualifyImportRowsInput) => {
      setOutcome({ kind: 'running' });

      try {
        const { data } = await qualifyImportRows({ variables: { input } });
        const read = readHermesQualifyImportRowsResult(
          data?.hermesQualifyImportRows,
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
    [qualifyImportRows],
  );

  const resetOutcome = useCallback(() => setOutcome({ kind: 'idle' }), []);

  return { outcome, qualifyRows, resetOutcome };
};
