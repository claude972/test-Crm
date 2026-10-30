import { useCallback, useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import { type HermesMailboxSenderAuthority } from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { normalizeHermesMailboxEmail } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Who this mailbox may send as.
//
// The contract is strict: the sender is the connected account's exact handle
// or an alias the workspace authorised by name. Sharing a domain grants
// nothing, so no comparison here ever looks at a domain to decide authority —
// it looks at one only to explain a refusal in the words a person will argue
// with.
//
// 'unknown' is a real third answer. The connected accounts are loaded once per
// workspace by the application shell; until they arrive this screen does not
// know its own address, and it says so rather than guessing one from a mail
// header.
export type HermesMailboxRuntimeIdentity =
  | { kind: 'unknown' }
  | {
      kind: 'known';
      // The exact handle of the connected account. The only address this
      // screen ever puts in `from`.
      mailboxAddress: string;
      aliases: string[];
    };

export type HermesMailboxRuntimeIdentityRead = {
  identity: HermesMailboxRuntimeIdentity;
  // What to show next to a planned envelope's sender.
  readAuthority: (email: string | null) => HermesMailboxSenderAuthority;
};

const domainOf = (email: string | null): string | null => {
  const normalized = normalizeHermesMailboxEmail(email);
  const at = normalized === null ? -1 : normalized.lastIndexOf('@');

  return at > 0 && normalized !== null ? normalized.slice(at + 1) : null;
};

export const useHermesMailboxRuntimeIdentity =
  (): HermesMailboxRuntimeIdentityRead => {
    const accounts = useAtomStateValue(myConnectedAccountsState);

    const identity = useMemo<HermesMailboxRuntimeIdentity>(() => {
      if (!isDefined(accounts)) {
        return { kind: 'unknown' };
      }

      // An archived account keeps its synced mail readable but cannot send, so
      // it is not offered as a sender.
      const account = accounts.find(
        (entry) =>
          !isDefined(entry.archivedAt) &&
          isDefined(normalizeHermesMailboxEmail(entry.handle)),
      );

      const mailboxAddress =
        account === undefined
          ? null
          : normalizeHermesMailboxEmail(account.handle);

      if (account === undefined || mailboxAddress === null) {
        return { kind: 'unknown' };
      }

      return {
        kind: 'known',
        mailboxAddress,
        aliases: (account.handleAliases ?? [])
          .map((alias) => normalizeHermesMailboxEmail(alias))
          .filter(
            (alias): alias is string =>
              alias !== null && alias !== mailboxAddress,
          ),
      };
    }, [accounts]);

    const readAuthority = useCallback(
      (email: string | null): HermesMailboxSenderAuthority => {
        const normalized = normalizeHermesMailboxEmail(email);

        if (identity.kind === 'unknown' || normalized === null) {
          return { kind: 'refused', reason: 'unknown' };
        }

        if (normalized === identity.mailboxAddress) {
          return { kind: 'mailbox' };
        }

        if (identity.aliases.includes(normalized)) {
          return { kind: 'authorizedAlias' };
        }

        // Named on purpose: an address on the mailbox's own domain is the
        // refusal somebody will push back on, so the screen says why sharing a
        // domain is not authority.
        return {
          kind: 'refused',
          reason:
            domainOf(normalized) === domainOf(identity.mailboxAddress)
              ? 'sameDomain'
              : 'notAuthorized',
        };
      },
      [identity],
    );

    return { identity, readAuthority };
  };
