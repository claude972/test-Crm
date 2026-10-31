import { useCallback, useMemo, useState } from 'react';

import { type HermesMailboxRuntimeSavedDraft } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeComposer';
import {
  findHermesMailboxRuntimeDraftIdentity,
  putHermesMailboxRuntimeDraftIdentity,
  readHermesMailboxRuntimeDraftIdentities,
  writeHermesMailboxRuntimeDraftIdentities,
  type HermesMailboxRuntimeDraftIdentity,
} from '@/hermes-mailbox-runtime/utils/hermesMailboxRuntimeDraftIdentities';

export type HermesMailboxRuntimeDraftIdentities = {
  // The identity for one native message of this mailbox, or null when none is
  // known — which is the answer whenever this browser did not receive one.
  find: (
    folder: string | null,
    uid: string | null,
    uidValidity: string | null,
  ) => HermesMailboxRuntimeDraftIdentity | null;
  remember: (draft: HermesMailboxRuntimeSavedDraft) => void;
};

// The draft identities this mailbox has been issued, kept across reloads.
//
// Only identities: a resumed draft's recipients and body still come from the
// server's read, and the save that follows is still its compare-and-swap.
// Scoped to the resolved mailbox, since a UID means nothing without one.
export const useHermesMailboxRuntimeDraftIdentities = (
  mailbox: string | null,
): HermesMailboxRuntimeDraftIdentities => {
  const [identities, setIdentities] = useState<
    HermesMailboxRuntimeDraftIdentity[]
  >(() => readHermesMailboxRuntimeDraftIdentities());

  const find = useCallback(
    (folder: string | null, uid: string | null, uidValidity: string | null) =>
      mailbox === null || folder === null || uid === null || uidValidity === null
        ? null
        : findHermesMailboxRuntimeDraftIdentity(identities, {
            mailbox,
            folder,
            uid,
            uidValidity,
          }),
    [identities, mailbox],
  );

  const remember = useCallback(
    (draft: HermesMailboxRuntimeSavedDraft) => {
      if (mailbox === null) {
        return;
      }

      setIdentities((current) => {
        const next = putHermesMailboxRuntimeDraftIdentity(
          current,
          mailbox,
          draft,
        );

        if (next !== current) {
          writeHermesMailboxRuntimeDraftIdentities(next);
        }

        return next;
      });
    },
    [mailbox],
  );

  return useMemo(() => ({ find, remember }), [find, remember]);
};
