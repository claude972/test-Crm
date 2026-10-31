import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_RUNTIME_UPDATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeUpdateCampaign';
import { type HermesRuntimeCampaignRecord } from '@/hermes-campaigns-runtime/types/HermesRuntimeCampaignRecord';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { type HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';

// The campaign's own draft fields, exactly those this screen edits. Written
// out rather than widened to the record type: a save must not be able to
// carry a status, a count or a sent date.
export type HermesRuntimeCampaignUpdateInput = {
  subject?: string;
  bodyTemplate?: string;
  fromAddress?: { primaryEmail: string; additionalEmails: null };
};

type UpdateMutationResult = {
  updateMessageCampaign: HermesRuntimeCampaignRecord | null;
};

type UpdateMutationVariables = {
  idToUpdate: string;
  input: HermesRuntimeCampaignUpdateInput;
};

// A recording whose outcome is not known, told apart from a refusal.
//
// `denied`, `rejected-input` and `conflict` are answers: the server read the
// request and said no, so the screen reports a refusal and the edit on screen
// is certainly not recorded. Anything else — a dropped connection, a
// transport error, an answer this screen cannot read — leaves the outcome
// genuinely unknown, and the only honest move is to say so and stop. Nothing
// here retries: a blind second attempt would either overwrite a newer edit or
// claim a success nobody observed.
const readSaveFailure = (
  error: unknown,
): Extract<HermesCampaignSaveState, { kind: 'failed' | 'unconfirmed' }> => {
  const failure = readHermesCallFailure(error);
  const reason = isDefined(failure.message) ? failure.message : null;

  return failure.kind === 'denied' ||
    failure.kind === 'rejected-input' ||
    failure.kind === 'conflict'
    ? { kind: 'failed', reasonCode: failure.kind.toUpperCase(), reason }
    : { kind: 'unconfirmed', reasonCode: failure.kind.toUpperCase(), reason };
};

// Records the campaign's own fields, so that what the operator wrote is still
// there after a reload.
//
// This is the whole point of the hook: the screen used to hold the subject,
// the message and the chosen sender in component state, which looked like
// saving and survived nothing. `setState` is not persistence.
//
// It emits nothing. `updateMessageCampaign` writes the campaign record; it
// queues no message and contacts no transport, and the engine re-reads the
// sender, the capability and the exclusions when the campaign actually
// departs. Recording a sender is therefore not an authorisation to use it:
// the server decides that at send time and can still refuse.
export const useHermesCampaignPersistence = ({
  campaignId,
  onRecorded,
}: {
  campaignId: string;
  // Re-reads the campaign from the server after a recording, so the screen
  // shows what was stored rather than what it hoped it stored.
  onRecorded: () => Promise<void> | void;
}) => {
  const apolloCoreClient = useApolloCoreClient();

  const [updateCampaign] = useMutation<
    UpdateMutationResult,
    UpdateMutationVariables
  >(HERMES_RUNTIME_UPDATE_CAMPAIGN, {
    client: apolloCoreClient,
    // An emission-adjacent write is never replayed by the transport: a retry
    // the person did not ask for is exactly how an uncertain outcome becomes
    // a duplicate.
    context: { skipRetry: true },
  });

  const [contentSaveState, setContentSaveState] =
    useState<HermesCampaignSaveState>({ kind: 'idle' });
  const [senderSaveState, setSenderSaveState] =
    useState<HermesCampaignSaveState>({ kind: 'idle' });

  const record = useCallback(
    async (
      input: HermesRuntimeCampaignUpdateInput,
      setState: (state: HermesCampaignSaveState) => void,
    ): Promise<boolean> => {
      setState({ kind: 'saving' });

      try {
        const { data } = await updateCampaign({
          variables: { idToUpdate: campaignId, input },
        });

        if (!isDefined(data?.updateMessageCampaign)) {
          // The call may well have been applied. Reporting a success here
          // would be a guess, and reporting a refusal would be another.
          setState({
            kind: 'unconfirmed',
            reasonCode: 'SERVER_ANSWER_UNREADABLE',
            reason: null,
          });

          return false;
        }

        setState({ kind: 'saved' });
        await onRecorded();

        return true;
      } catch (error) {
        setState(readSaveFailure(error));

        return false;
      }
    },
    [campaignId, updateCampaign, onRecorded],
  );

  const saveContent = useCallback(
    ({ subject, body }: { subject: string; body: string }) =>
      // `body` on screen is `bodyTemplate` on the record: the field keeps its
      // own name here so the mapping is visible at the boundary.
      record({ subject, bodyTemplate: body }, setContentSaveState),
    [record],
  );

  const saveSender = useCallback(
    (primaryEmail: string) =>
      record(
        { fromAddress: { primaryEmail, additionalEmails: null } },
        setSenderSaveState,
      ),
    [record],
  );

  // Said by the screen as soon as what is shown differs from what the server
  // holds, so an unrecorded draft is never mistaken for a recorded one.
  const markContentUnsaved = useCallback(() => {
    setContentSaveState((current) =>
      current.kind === 'saving' ? current : { kind: 'unsaved' },
    );
  }, []);

  return {
    contentSaveState,
    senderSaveState,
    saveContent,
    saveSender,
    markContentUnsaved,
  };
};
