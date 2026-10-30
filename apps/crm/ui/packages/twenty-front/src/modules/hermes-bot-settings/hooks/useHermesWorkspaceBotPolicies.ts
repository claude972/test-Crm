import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_SET_WORKSPACE_BOT_POLICY } from '@/hermes-bot-settings/graphql/metadata-mutations/hermesSetWorkspaceBotPolicy';
import { HERMES_WORKSPACE_BOT_POLICIES } from '@/hermes-bot-settings/graphql/metadata-queries/hermesWorkspaceBotPolicies';
import {
  type HermesBotPoliciesRead,
  type HermesBotPolicyScope,
  type HermesBotPolicyWriteMode,
} from '@/hermes-bot-settings/types/HermesBotPolicy';
import {
  readHermesBotPolicyList,
  readHermesBotPolicyWriteResult,
} from '@/hermes-bot-settings/utils/readHermesBotPolicyPayload';
import {
  readHermesBotSettingsFailure,
  type HermesBotSettingsFailureKind,
} from '@/hermes-bot-settings/utils/readHermesBotSettingsFailure';

// Every state carries the scope it belongs to, so one row's progress or
// refusal is never shown on another row.
export type HermesBotPolicyWriteState =
  | { kind: 'idle' }
  | { kind: 'requesting'; scope: HermesBotPolicyScope }
  // What the SERVER settled on, which is not always what was asked for. The
  // mode is null when the answer carried none that could be read.
  | { kind: 'saved'; scope: HermesBotPolicyScope; mode: string | null }
  // The call left but the answer could not be read, so the outcome is
  // unknown: not a save and not a failure.
  | { kind: 'unconfirmed'; scope: HermesBotPolicyScope }
  // Nothing was sent: there was no revision to send with it.
  | { kind: 'not-sent'; scope: HermesBotPolicyScope }
  | {
      kind: 'refused';
      scope: HermesBotPolicyScope;
      reason: HermesBotSettingsFailureKind;
      message: string | null;
    };

export type HermesWorkspaceBotPolicies = {
  read: HermesBotPoliciesRead;
  writeState: HermesBotPolicyWriteState;
  setMode: (
    scope: HermesBotPolicyScope,
    mode: HermesBotPolicyWriteMode,
  ) => void;
  resetWriteState: () => void;
};

// The company-wide and per-channel bot policy, read from the server and
// changed through it.
//
// A failed read stays 'unknown'. It is not an absence of policy and it is not
// a reason to show a default: the screen says the policy could not be read and
// offers no mode in its place. This also covers a deployment whose schema does
// not expose these operations yet, so the settings page degrades instead of
// breaking.
//
// The answer is authoritative and the request is not. Asking for AUTO does not
// make a scope automatic: the server applies its own restriction rules and
// returns what it decided, and nothing here recomputes that.
export const useHermesWorkspaceBotPolicies = (): HermesWorkspaceBotPolicies => {
  const { data, loading, error, refetch } = useQuery<{
    hermesWorkspaceBotPolicies: unknown;
  }>(HERMES_WORKSPACE_BOT_POLICIES, {
    // A policy is a point-in-time fact. A cached answer would keep showing a
    // delegation that somebody else has already revoked.
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [writeState, setWriteState] = useState<HermesBotPolicyWriteState>({
    kind: 'idle',
  });

  // skipRetry: a policy write must never be replayed by a transport retry. A
  // revoked delegation that comes back on its own is exactly the failure the
  // contract forbids.
  const [setPolicyMutation] = useMutation<
    { hermesSetWorkspaceBotPolicy: unknown },
    {
      input: {
        scope: HermesBotPolicyScope;
        mode: HermesBotPolicyWriteMode;
        expectedRevision: string;
      };
    }
  >(HERMES_SET_WORKSPACE_BOT_POLICY, { context: { skipRetry: true } });

  const read = useMemo<HermesBotPoliciesRead>(() => {
    if (loading) {
      return { kind: 'loading' };
    }

    if (isDefined(error)) {
      return { kind: 'unknown' };
    }

    const payload = readHermesBotPolicyList(data?.hermesWorkspaceBotPolicies);

    return payload.kind === 'read'
      ? {
          kind: 'reported',
          policies: payload.value.policies,
          unreadableEntryCount: payload.value.unreadableEntryCount,
        }
      : { kind: 'unknown' };
  }, [data, error, loading]);

  const setMode = useCallback(
    (scope: HermesBotPolicyScope, mode: HermesBotPolicyWriteMode) => {
      const revision =
        read.kind === 'reported'
          ? (read.policies.find((policy) => policy.scope === scope)?.revision ??
            null)
          : null;

      // Without the revision there is nothing for the server to compare, and a
      // write that cannot be refused for staleness is a write that can
      // overwrite someone else's decision. So nothing is sent, and the screen
      // says so.
      if (revision === null) {
        setWriteState({ kind: 'not-sent', scope });

        return;
      }

      setWriteState({ kind: 'requesting', scope });

      void setPolicyMutation({
        variables: { input: { scope, mode, expectedRevision: revision } },
      })
        .then(({ data: answer }) => {
          const payload = readHermesBotPolicyWriteResult(
            answer?.hermesSetWorkspaceBotPolicy,
          );

          if (payload.kind !== 'read') {
            // An unreadable answer is not a success. The rows keep showing
            // whatever the server last reported.
            setWriteState({ kind: 'unconfirmed', scope });
          } else {
            // The mode that comes back, never the one that was asked for. An
            // unrecognised mode is kept verbatim for the same reason, and no
            // placeholder mode is invented when none could be read.
            setWriteState({
              kind: 'saved',
              scope,
              mode: payload.value.mode ?? payload.value.unknownMode,
            });
          }

          // Refreshed on its own, and its failure is not this write's
          // failure: a refresh that does not come back leaves the query in
          // error, which the read already reports as unknown.
          refetch().catch(() => {});
        })
        .catch((failure: unknown) => {
          const failureRead = readHermesBotSettingsFailure(failure);

          setWriteState({
            kind: 'refused',
            scope,
            reason: failureRead.kind,
            message: failureRead.message,
          });
        });
    },
    [read, refetch, setPolicyMutation],
  );

  const resetWriteState = useCallback(() => {
    setWriteState({ kind: 'idle' });
  }, []);

  return { read, writeState, setMode, resetWriteState };
};
