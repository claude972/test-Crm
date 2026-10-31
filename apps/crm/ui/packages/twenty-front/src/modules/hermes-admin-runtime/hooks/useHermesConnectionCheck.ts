import { useApolloClient, useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  readHermesProbesForUiKind,
  type HermesConnectionCheckOutcome,
  type HermesConnectionProbe,
} from '@/hermes-admin-ui/types/HermesConnectionCheck';
import { HERMES_TEST_MAIL_CONNECTION_V4 } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesTestMailConnectionV4';
import { HERMES_EVOLUTION_CONNECTION } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesEvolutionConnection';
import {
  readHermesEvolutionCheckPayload,
  readHermesMailCheckPayload,
} from '@/hermes-admin-runtime/utils/readHermesConnectionCheck';
import { readHermesRuntimeFailure } from '@/hermes-admin-runtime/utils/readHermesRuntimeFailure';

export type HermesConnectionChecks = {
  // The last outcome per probe. A probe nobody ran has no entry, which the
  // screen shows as « jamais testé » rather than as a failure.
  outcomeByProbe: Readonly<Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>>;
  isChecking: boolean;
  // Runs every read-only probe published for one channel. For mail that is two
  // probes, reported separately.
  requestCheck: (uiKind: HermesConnectionKind | null) => void;
  resetChecks: () => void;
};

// The connection tests of the settings centre.
//
// Nothing here interprets a provider: each outcome is what a server answered,
// read by a pure reader. Nothing is inferred from the request having been
// sent, and no outcome can be « connecté » — the strongest result is
// reachability at a dated instant.
export const useHermesConnectionCheck = (): HermesConnectionChecks => {
  const client = useApolloClient();

  const [outcomeByProbe, setOutcomeByProbe] = useState<
    Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>
  >({});
  const [inFlight, setInFlight] = useState(0);

  // skipRetry: a probe is a deliberate diagnostic. A transport replay would
  // dial a provider the operator asked about once, several times.
  const [testMailMutation] = useMutation<
    { hermesTestMailConnectionV4: unknown },
    { input: { probe: HermesConnectionProbe } }
  >(HERMES_TEST_MAIL_CONNECTION_V4, { context: { skipRetry: true } });

  const record = useCallback(
    (probe: HermesConnectionProbe, outcome: HermesConnectionCheckOutcome) => {
      setOutcomeByProbe((current) => ({ ...current, [probe]: outcome }));
    },
    [],
  );

  // One failure mapping for both probes. A replaced session is a settled
  // answer and asks for a reload; a refusal is the server's own words; an
  // unreadable answer proves nothing and is neither.
  const applyFailure = useCallback(
    (probe: HermesConnectionProbe, failure: unknown) => {
      const failureRead = readHermesRuntimeFailure(failure);

      if (failureRead.kind === 'session-replaced') {
        record(probe, {
          kind: 'session-replaced',
          message: failureRead.message,
        });

        return;
      }

      // CONNECTION_REVISION_CONFLICT: the configuration moved on. The probe's
      // answer, if any, belongs to credentials that are no longer current.
      if (failureRead.kind === 'stale') {
        record(probe, { kind: 'connection-changed' });

        return;
      }

      if (failureRead.kind === 'failed') {
        record(probe, { kind: 'unconfirmed' });

        return;
      }

      record(probe, { kind: 'refused', reason: failureRead.message });
    },
    [record],
  );

  const runProbe = useCallback(
    async (probe: HermesConnectionProbe): Promise<void> => {
      record(probe, { kind: 'checking' });

      try {
        if (probe === 'EVOLUTION_INSTANCE_STATE') {
          // network-only: a probe answers about an instant, and a cached
          // answer would date a reachability that was never re-established.
          const answer = await client.query<{
            hermesEvolutionConnection: unknown;
          }>({
            query: HERMES_EVOLUTION_CONNECTION,
            fetchPolicy: 'network-only',
            errorPolicy: 'none',
          });

          record(
            probe,
            isDefined(answer.data?.hermesEvolutionConnection)
              ? readHermesEvolutionCheckPayload(
                  answer.data.hermesEvolutionConnection,
                )
              : { kind: 'unconfirmed' },
          );

          return;
        }

        const answer = await testMailMutation({ variables: { input: { probe } } });

        record(
          probe,
          isDefined(answer.data?.hermesTestMailConnectionV4)
            ? readHermesMailCheckPayload(
                answer.data.hermesTestMailConnectionV4,
                probe,
              )
            : { kind: 'unconfirmed' },
        );
      } catch (failure) {
        applyFailure(probe, failure);
      }
    },
    [applyFailure, client, record, testMailMutation],
  );

  const requestCheck = useCallback(
    (uiKind: HermesConnectionKind | null) => {
      const probes = readHermesProbesForUiKind(uiKind);

      // No probe is published for this channel. Said plainly instead of
      // leaving a button that appears to work and does nothing.
      if (probes.length === 0) {
        return;
      }

      setInFlight((current) => current + probes.length);

      for (const probe of probes) {
        void runProbe(probe).finally(() => {
          setInFlight((current) => Math.max(0, current - 1));
        });
      }
    },
    [runProbe],
  );

  const resetChecks = useCallback(() => {
    setOutcomeByProbe({});
  }, []);

  return {
    outcomeByProbe,
    isChecking: inFlight > 0,
    requestCheck,
    resetChecks,
  };
};
