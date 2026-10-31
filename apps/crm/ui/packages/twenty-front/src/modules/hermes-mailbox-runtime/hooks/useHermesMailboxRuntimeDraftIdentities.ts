import { useCallback, useMemo, useState } from 'react';

import { type HermesMailboxRuntimeSavedDraft } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';
import {
  findHermesMailboxRuntimeDraftIdentity,
  putHermesMailboxRuntimeDraftIdentity,
  readHermesMailboxRuntimeDraftIdentities,
  writeHermesMailboxRuntimeDraftIdentities,
  type HermesMailboxRuntimeDraftIdentity,
  type HermesMailboxRuntimeDraftScope,
} from '@/hermes-mailbox-runtime/utils/hermesMailboxRuntimeDraftIdentities';

export type HermesMailboxRuntimeDraftIdentities = {
  // The identity for one native message of this scope, or null when none is
  // known — the answer whenever this browser was issued none.
  find: (
    folder: string | null,
    uid: string | null,
    uidValidity: string | null,
  ) => HermesMailboxRuntimeDraftIdentity | null;
  remember: (draft: HermesMailboxRuntimeSavedDraft) => void;
};

// The draft identities one scope has been issued, kept across reloads.
//
// Only identities: a resumed draft's recipients and body come from the
// server's read, and the save that follows is still its compare-and-swap. A
// null scope reads and writes nothing, which is what a signed-out or
// not-yet-loaded session is. `scope` must be stable across renders.
export const useHermesMailboxRuntimeDraftIdentities = (
  scope: HermesMailboxRuntimeDraftScope | null,
): HermesMailboxRuntimeDraftIdentities => {
  // Storage is the state. This only says which read is current, so a write
  // re-reads instead of answering from a copy taken before it.
  const [generation, setGeneration] = useState(0);

  const identities = useMemo<HermesMailboxRuntimeDraftIdentity[]>(
    () => (scope === null ? [] : readHermesMailboxRuntimeDraftIdentities(scope)),
    [generation, scope],
  );

  const find = useCallback(
    (folder: string | null, uid: string | null, uidValidity: string | null) =>
      folder === null || uid === null || uidValidity === null
        ? null
        : findHermesMailboxRuntimeDraftIdentity(identities, {
            folder,
            uid,
            uidValidity,
          }),
    [identities],
  );

  const remember = useCallback(
    (draft: HermesMailboxRuntimeSavedDraft) => {
      if (scope === null) {
        return;
      }

      const next = putHermesMailboxRuntimeDraftIdentity(identities, draft);

      if (next === identities) {
        return;
      }

      writeHermesMailboxRuntimeDraftIdentities(scope, next);
      setGeneration((current) => current + 1);
    },
    [identities, scope],
  );

  return useMemo(() => ({ find, remember }), [find, remember]);
};
