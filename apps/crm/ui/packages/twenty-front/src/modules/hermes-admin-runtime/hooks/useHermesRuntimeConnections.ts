import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesConnectionsRead } from '@/hermes-admin-ui/types/HermesConnection';
import {
  type HermesConnectionFormSubmission,
  type HermesConnectionSaveState,
} from '@/hermes-admin-ui/types/HermesConnectionForm';
import { HERMES_REMOVE_CONNECTION_V4 } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesRemoveConnectionV4';
import { HERMES_SAVE_CONNECTION_V4 } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesSaveConnectionV4';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-admin-runtime/graphql/metadata-queries/hermesConnectionsV4';
import {
  type HermesRuntimeConnectionKind,
  type HermesRuntimeWriteSupport,
} from '@/hermes-admin-runtime/types/HermesRuntimeConnectionKind';
import { buildHermesConnectionV4Write } from '@/hermes-admin-runtime/utils/buildHermesConnectionV4Write';
import {
  readHermesConnectionsV4Payload,
  toHermesExpectedRevision,
  type HermesRuntimeConnectionView,
} from '@/hermes-admin-runtime/utils/readHermesConnectionsV4Payload';
import { readHermesRuntimeFailure } from '@/hermes-admin-runtime/utils/readHermesRuntimeFailure';

// Why a write was not attempted at all, when the reason is this screen's own
// shortcoming rather than anything the server said. Kept apart from a refusal
// so the operator is not told the backend declined something it never saw.
export type HermesRuntimeWriteBlock =
  | { kind: 'none' }
  | { kind: 'unsupported'; support: HermesRuntimeWriteSupport };

export type HermesRuntimeConnections = {
  read: HermesConnectionsRead;
  // The published views behind that read, kept so a form can open on the
  // non-secret settings the server actually reported. No secret is ever among
  // them: the server returns none.
  views: readonly HermesRuntimeConnectionView[];
  saveState: HermesConnectionSaveState;
  writeBlock: HermesRuntimeWriteBlock;
  hasWriteInFlight: boolean;
  // True once the server has answered that the session was replaced. The
  // container turns this into a stale context, which is a reload request and
  // never a retry.
  isSessionReplaced: boolean;
  save: (
    runtimeKind: HermesRuntimeConnectionKind,
    support: HermesRuntimeWriteSupport,
    submission: HermesConnectionFormSubmission,
  ) => void;
  remove: (
    runtimeKind: HermesRuntimeConnectionKind,
    support: HermesRuntimeWriteSupport,
    expectedRevision: string | null,
  ) => void;
  resetWriteState: () => void;
  // Said plainly when this screen has no way to compose a write for the kind
  // at hand. It is this screen's limit, not a server answer, and nothing is
  // sent.
  reportUnsupported: (support: HermesRuntimeWriteSupport) => void;
};

// The central connections of the active operating company, read from the
// server and written through it.
//
// A failed read stays 'unknown'. It is not an empty list and it is not a
// reason to show a channel as « Non configuré »: that would be a claim about
// a configuration nobody managed to read. An empty list, on the other hand, is
// a real answer — a company can genuinely have nothing set up.
export const useHermesRuntimeConnections = (
  companyId: string | null,
): HermesRuntimeConnections => {
  const { data, loading, error, refetch } = useQuery<{
    hermesConnectionsV4: unknown;
  }>(HERMES_CONNECTIONS_V4, {
    // A configuration is a point-in-time fact, and the revision read here is
    // what a write is refused on. A cached answer would hand the next save a
    // revision that is already stale.
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [saveState, setSaveState] = useState<HermesConnectionSaveState>({
    kind: 'idle',
  });
  const [writeBlock, setWriteBlock] = useState<HermesRuntimeWriteBlock>({
    kind: 'none',
  });
  const [isSessionReplaced, setIsSessionReplaced] = useState(false);

  // skipRetry on both: a connection write must never be replayed by a
  // transport retry. Every save and every removal stops the bot delegations of
  // the affected channel and advances a revision, so a silent replay would
  // revoke a delegation the operator re-granted in between.
  const [saveMutation] = useMutation<
    { hermesSaveConnectionV4: unknown },
    {
      input: {
        kind: string;
        expectedRevision: number;
        settings: Record<string, unknown>;
        secrets?: Record<string, unknown>;
      };
    }
  >(HERMES_SAVE_CONNECTION_V4, { context: { skipRetry: true } });

  const [removeMutation] = useMutation<
    { hermesRemoveConnectionV4: unknown },
    { input: { kind: string; expectedRevision: number } }
  >(HERMES_REMOVE_CONNECTION_V4, { context: { skipRetry: true } });

  const payload = useMemo(
    () =>
      readHermesConnectionsV4Payload(data?.hermesConnectionsV4, companyId),
    [data, companyId],
  );

  const read = useMemo<HermesConnectionsRead>(() => {
    if (loading) {
      return { kind: 'loading' };
    }

    if (isDefined(error)) {
      return { kind: 'unknown', message: error.message };
    }

    if (!isDefined(data?.hermesConnectionsV4)) {
      return { kind: 'unknown', message: null };
    }

    return {
      kind: 'reported',
      connections: payload.connections,
      unreadableEntryCount: payload.unreadableEntryCount,
    };
  }, [data, error, loading, payload]);

  // The revision of one kind as it was actually read, configured or not.
  //
  // This is what makes a CREATE sendable. The contract is explicit: a
  // first-ever save takes revision 0, but recreating after a removal takes the
  // latest TOMBSTONE revision and not 0. Both arrive in the kind's view, so
  // the read value is used and nothing is assumed. Without a view for the
  // kind there is no revision, and nothing is sent.
  const readRevisionForKind = useCallback(
    (runtimeKind: HermesRuntimeConnectionKind): string | null =>
      payload.views.find(
        (view: HermesRuntimeConnectionView) => view.runtimeKind === runtimeKind,
      )?.revision ?? null,
    [payload],
  );

  const applyFailure = useCallback((failure: unknown) => {
    const failureRead = readHermesRuntimeFailure(failure);

    if (failureRead.kind === 'session-replaced') {
      // A settled answer. Nothing is retried and nothing is hidden behind a
      // loading state: the operator is asked to reload.
      setIsSessionReplaced(true);
      setSaveState({ kind: 'session-replaced', message: failureRead.message });

      return;
    }

    setSaveState({ kind: 'refused', reason: failureRead.message });
  }, []);

  const save = useCallback(
    (
      runtimeKind: HermesRuntimeConnectionKind,
      support: HermesRuntimeWriteSupport,
      submission: HermesConnectionFormSubmission,
    ) => {
      if (support.kind !== 'supported') {
        // This screen cannot compose the write. Nothing is sent, and it is
        // reported as this screen's limit rather than as a server refusal.
        setWriteBlock({ kind: 'unsupported', support });
        setSaveState({ kind: 'idle' });

        return;
      }

      setWriteBlock({ kind: 'none' });

      // On an edit the form echoes back the revision it was read at. On a
      // create it carries none, so the kind's own read revision is used —
      // which is the tombstone after a removal, exactly as the contract
      // requires.
      const revision =
        submission.expectedRevision ?? readRevisionForKind(runtimeKind);
      const expectedRevision = toHermesExpectedRevision(revision);

      // Without a revision that was actually read, nothing leaves the browser.
      // A save built without one could overwrite a decision taken in between,
      // and the screen says so instead of sending it anyway.
      if (expectedRevision === null) {
        setSaveState({ kind: 'not-sent', reason: 'missing-revision' });

        return;
      }

      const build = buildHermesConnectionV4Write(
        runtimeKind,
        submission,
        expectedRevision,
      );

      if (build.kind !== 'built') {
        setWriteBlock({
          kind: 'unsupported',
          support: { kind: 'no-server-kind' },
        });

        return;
      }

      setSaveState({ kind: 'saving' });

      void saveMutation({ variables: { input: build.write } })
        .then((answer) => {
          if (!isDefined(answer.data?.hermesSaveConnectionV4)) {
            // The call left and the answer could not be read. That is neither
            // a save nor a failure, and it is certainly not a verification.
            setSaveState({ kind: 'unconfirmed' });
          } else {
            // Saved, with no verification date: this contract publishes no
            // connection test, so nothing is ever presented as connected.
            setSaveState({ kind: 'saved', verifiedAt: null });
          }

          // Refreshed on its own so the next write carries the new revision.
          // Its failure is not this write's failure: a refresh that does not
          // come back leaves the query in error, which the read already
          // reports as unknown.
          refetch().catch(() => {});
        })
        .catch(applyFailure);
    },
    [applyFailure, readRevisionForKind, refetch, saveMutation],
  );

  const remove = useCallback(
    (
      runtimeKind: HermesRuntimeConnectionKind,
      support: HermesRuntimeWriteSupport,
      expectedRevision: string | null,
    ) => {
      // A removal needs no form control, so a kind this screen cannot SAVE can
      // still be removed. Only a kind with no server kind at all is refused.
      if (support.kind === 'no-server-kind') {
        setWriteBlock({ kind: 'unsupported', support });

        return;
      }

      setWriteBlock({ kind: 'none' });

      const revision = toHermesExpectedRevision(expectedRevision);

      if (revision === null) {
        setSaveState({ kind: 'not-sent', reason: 'missing-revision' });

        return;
      }

      setSaveState({ kind: 'saving' });

      void removeMutation({
        variables: { input: { kind: runtimeKind, expectedRevision: revision } },
      })
        .then((answer) => {
          if (!isDefined(answer.data?.hermesRemoveConnectionV4)) {
            setSaveState({ kind: 'unconfirmed' });
          } else {
            setSaveState({ kind: 'saved', verifiedAt: null });
          }

          refetch().catch(() => {});
        })
        .catch(applyFailure);
    },
    [applyFailure, refetch, removeMutation],
  );

  const reportUnsupported = useCallback(
    (support: HermesRuntimeWriteSupport) => {
      setWriteBlock({ kind: 'unsupported', support });
      setSaveState({ kind: 'idle' });
    },
    [],
  );

  const resetWriteState = useCallback(() => {
    setSaveState({ kind: 'idle' });
    setWriteBlock({ kind: 'none' });
  }, []);

  return {
    read,
    views: payload.views,
    saveState,
    writeBlock,
    hasWriteInFlight: saveState.kind === 'saving',
    isSessionReplaced,
    save,
    remove,
    resetWriteState,
    reportUnsupported,
  };
};
