import { useApolloClient, useMutation } from '@apollo/client/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesConnectionKind } from '@/hermes-admin-ui/types/HermesConnection';
import {
  readHermesProbesForUiKind,
  type HermesCheckTarget,
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

type HermesCheckEntry = {
  // Bumped by every invalidation. A reply carrying an older generation is a
  // late answer about a configuration the screen has already left behind.
  generation: number;
  target: HermesCheckTarget;
  outcome: HermesConnectionCheckOutcome;
};

export type HermesConnectionChecks = {
  // Only results belonging to the current generation and the given target. A
  // probe nobody ran has no entry, shown as « jamais testé ».
  readOutcomes: (
    target: HermesCheckTarget | null,
  ) => Readonly<
    Partial<Record<HermesConnectionProbe, HermesConnectionCheckOutcome>>
  >;
  isChecking: boolean;
  requestCheck: (
    uiKind: HermesConnectionKind | null,
    target: HermesCheckTarget,
  ) => void;
  // Discards every held result and makes in-flight answers unusable. Called
  // whenever a configuration is written, so no badge survives the change.
  invalidate: () => void;
};

const sameTarget = (
  a: HermesCheckTarget,
  b: HermesCheckTarget | null,
): boolean =>
  b !== null &&
  a.companyId === b.companyId &&
  a.connectionId === b.connectionId &&
  a.revision === b.revision;

// The connection tests of the settings centre.
//
// Every outcome is what a server answered, read by a pure reader, and bound to
// the configuration it describes. Nothing is inferred from the request having
// been sent, and no outcome can be « connecté ».
export const useHermesConnectionCheck = (): HermesConnectionChecks => {
  const client = useApolloClient();

  const [entries, setEntries] = useState<
    Partial<Record<HermesConnectionProbe, HermesCheckEntry>>
  >({});
  const [inFlight, setInFlight] = useState(0);

  // A ref, not state: a reply that resolves after an invalidation has to see
  // the generation as it is NOW, not as it was when the closure was made.
  const generationRef = useRef(0);

  const [testMailMutation] = useMutation<
    { hermesTestMailConnectionV4: unknown },
    { input: { probe: HermesConnectionProbe } }
  >(HERMES_TEST_MAIL_CONNECTION_V4, { context: { skipRetry: true } });

  // Records a result only if nothing has invalidated it meanwhile.
  const record = useCallback(
    (
      probe: HermesConnectionProbe,
      generation: number,
      target: HermesCheckTarget,
      outcome: HermesConnectionCheckOutcome,
    ) => {
      if (generation !== generationRef.current) {
        return;
      }

      setEntries((current) => {
        const held = current[probe];

        // A slower reply from an earlier generation cannot overwrite a newer
        // one, so results never go backwards.
        if (held !== undefined && held.generation > generation) {
          return current;
        }

        return { ...current, [probe]: { generation, target, outcome } };
      });
    },
    [],
  );

  const applyFailure = useCallback(
    (
      probe: HermesConnectionProbe,
      generation: number,
      target: HermesCheckTarget,
      failure: unknown,
    ) => {
      const failureRead = readHermesRuntimeFailure(failure);

      if (failureRead.kind === 'session-replaced') {
        record(probe, generation, target, {
          kind: 'session-replaced',
          message: failureRead.message,
        });

        return;
      }

      // CONNECTION_REVISION_CONFLICT: the configuration moved on, so any
      // answer belongs to credentials that are no longer current.
      if (failureRead.kind === 'stale') {
        record(probe, generation, target, { kind: 'connection-changed' });

        return;
      }

      if (failureRead.kind === 'failed') {
        record(probe, generation, target, { kind: 'unconfirmed' });

        return;
      }

      record(probe, generation, target, {
        kind: 'refused',
        reason: failureRead.message,
      });
    },
    [record],
  );

  const runProbe = useCallback(
    async (
      probe: HermesConnectionProbe,
      generation: number,
      target: HermesCheckTarget,
    ): Promise<void> => {
      record(probe, generation, target, { kind: 'checking' });

      try {
        if (probe === 'EVOLUTION_INSTANCE_STATE') {
          // network-only: a probe answers about an instant, and a cached
          // answer would date a reachability never re-established.
          const answer = await client.query<{
            hermesEvolutionConnection: unknown;
          }>({
            query: HERMES_EVOLUTION_CONNECTION,
            fetchPolicy: 'network-only',
            errorPolicy: 'none',
          });

          record(
            probe,
            generation,
            target,
            isDefined(answer.data?.hermesEvolutionConnection)
              ? readHermesEvolutionCheckPayload(
                  answer.data.hermesEvolutionConnection,
                )
              : { kind: 'unconfirmed' },
          );

          return;
        }

        const answer = await testMailMutation({
          variables: { input: { probe } },
        });

        record(
          probe,
          generation,
          target,
          isDefined(answer.data?.hermesTestMailConnectionV4)
            ? readHermesMailCheckPayload(
                answer.data.hermesTestMailConnectionV4,
                probe,
                {
                  connectionId: target.connectionId,
                  revision: target.revision,
                },
              )
            : { kind: 'unconfirmed' },
        );
      } catch (failure) {
        applyFailure(probe, generation, target, failure);
      }
    },
    [applyFailure, client, record, testMailMutation],
  );

  const requestCheck = useCallback(
    (uiKind: HermesConnectionKind | null, target: HermesCheckTarget) => {
      const probes = readHermesProbesForUiKind(uiKind);

      // No probe is published for this channel. Nothing is dialled and nothing
      // is claimed.
      if (probes.length === 0) {
        return;
      }

      // A fresh request supersedes anything still in flight, so an older
      // answer cannot land on this one's result.
      generationRef.current += 1;

      const generation = generationRef.current;

      setEntries({});
      setInFlight((current) => current + probes.length);

      for (const probe of probes) {
        void runProbe(probe, generation, target).finally(() => {
          setInFlight((current) => Math.max(0, current - 1));
        });
      }
    },
    [runProbe],
  );

  const invalidate = useCallback(() => {
    generationRef.current += 1;
    setEntries({});
  }, []);

  const readOutcomes = useCallback(
    (target: HermesCheckTarget | null) => {
      const outcomes: Partial<
        Record<HermesConnectionProbe, HermesConnectionCheckOutcome>
      > = {};

      for (const [probe, entry] of Object.entries(entries)) {
        if (entry === undefined) {
          continue;
        }

        // Held results must match the current generation AND the card being
        // filled. Either mismatch means this result is about something else.
        if (
          entry.generation === generationRef.current &&
          sameTarget(entry.target, target)
        ) {
          outcomes[probe as HermesConnectionProbe] = entry.outcome;
        }
      }

      return outcomes;
    },
    [entries],
  );

  return useMemo(
    () => ({
      readOutcomes,
      isChecking: inFlight > 0,
      requestCheck,
      invalidate,
    }),
    [inFlight, invalidate, readOutcomes, requestCheck],
  );
};
