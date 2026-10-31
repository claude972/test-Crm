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

  // Returns the outcome it just recorded, so a caller can act on a CONFIRMED
  // qualification only. A refused call and an unreadable answer are both
  // outcomes this function returns rather than throws, which is exactly why a
  // caller must not treat "the promise settled" as "the rows were qualified".
  const qualifyRows = useCallback(
    async (
      input: HermesQualifyImportRowsInput,
    ): Promise<HermesQualifyImportRowsOutcome> => {
      setOutcome({ kind: 'running' });

      try {
        const { data } = await qualifyImportRows({ variables: { input } });
        const read = readHermesQualifyImportRowsResult(
          data?.hermesQualifyImportRows,
        );
        const next: HermesQualifyImportRowsOutcome =
          read.kind === 'read'
            ? { kind: 'read', result: read.value }
            : { kind: 'unreadable', problem: read.problem };

        setOutcome(next);

        return next;
      } catch (error) {
        const failed: HermesQualifyImportRowsOutcome = {
          kind: 'failed',
          failure: readHermesCallFailure(error),
        };

        setOutcome(failed);

        return failed;
      }
    },
    [qualifyImportRows],
  );

  const resetOutcome = useCallback(() => setOutcome({ kind: 'idle' }), []);

  return { outcome, qualifyRows, resetOutcome };
};
