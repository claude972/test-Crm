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
// Why this exists: no operation publishes a native draft's stable id or its
// opaque revision, so a reload used to lose both and the resume button went
// with them. What is kept here is never computed — it is the server's own
// answer to a save, stored verbatim and replayed verbatim.
//
// What is kept is only an identity. The recipients, the subject and the body
// of a resumed draft still come from the server's read of the native message,
// and the save that follows is still the server's compare-and-swap: a stored
// revision the provider has moved past is refused there, not accepted here.
//
// Scoped to the mailbox the central connection resolved. Without one, nothing
// is read or written: a UID means nothing without the account it belongs to.
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
