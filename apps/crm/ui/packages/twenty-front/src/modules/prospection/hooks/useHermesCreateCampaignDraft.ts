import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { HERMES_CREATE_CAMPAIGN_DRAFT } from '@/prospection/graphql/metadata-mutations/hermesCreateCampaignDraft';
import { type HermesCallOutcome } from '@/prospection/types/HermesCallOutcome';
import { type HermesCreateCampaignDraftInput } from '@/prospection/types/HermesImportInput';
import { type HermesCampaignDraftResult } from '@/prospection/types/HermesOperationResults';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesCampaignDraftResult } from '@/prospection/utils/readHermesPayload';

export type HermesCampaignDraftOutcome =
  HermesCallOutcome<HermesCampaignDraftResult>;

// Creates a draft campaign, its audience list and its members. The contract
// returns sendingAvailable false and performs no send; this module exposes no
// sending call at all.
export const useHermesCreateCampaignDraft = () => {
  const [createCampaignDraft] = useMutation<
    { hermesCreateCampaignDraft: unknown },
    { input: HermesCreateCampaignDraftInput }
  >(HERMES_CREATE_CAMPAIGN_DRAFT);

  const [outcome, setOutcome] = useState<HermesCampaignDraftOutcome>({
    kind: 'idle',
  });

  const createDraft = useCallback(
    async (input: HermesCreateCampaignDraftInput) => {
      setOutcome({ kind: 'running' });

      try {
        const { data } = await createCampaignDraft({ variables: { input } });
        const read = readHermesCampaignDraftResult(
          data?.hermesCreateCampaignDraft,
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
    [createCampaignDraft],
  );

  const resetOutcome = useCallback(() => setOutcome({ kind: 'idle' }), []);

  return { outcome, createDraft, resetOutcome };
};
