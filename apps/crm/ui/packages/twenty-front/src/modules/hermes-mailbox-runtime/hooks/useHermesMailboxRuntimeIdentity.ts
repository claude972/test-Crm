import { useQuery } from '@apollo/client/react';
import { useCallback, useMemo } from 'react';
import { isDefined } from 'kovaa-lab-shared/utils';

import { myConnectedAccountsState } from '@/accounts/states/myConnectedAccountsState';
import { HERMES_CONNECTIONS_V4 } from '@/hermes-mailbox-runtime/graphql/metadata-queries/hermesConnectionsV4';
import { readHermesMailboxRuntimeFailure } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimeFailure';
import { readHermesMailboxRuntimeMailConnection } from '@/hermes-mailbox-runtime/utils/readHermesMailboxRuntimePayload';
import { type HermesMailboxSenderAuthority } from '@/hermes-mailbox-ui/types/HermesMailboxComposition';
import { normalizeHermesMailboxEmail } from '@/hermes-mailbox-ui/utils/parseHermesMailboxAddress';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Who this mailbox may send as.
//
// The identity is resolved from the **central** MAIL connection, which names
// the authorised `connectedAccountId`, and only then from the native connected
// account carrying that exact id. Taking the first connected account instead
// would propose the wrong mailbox the moment a workspace has two, and the
// server would refuse the send.
//
// Everything here is closed by default. A central connection that is absent,
// unreadable, or that matches no native account leaves the identity unknown,
// and an unknown identity offers no sender and no send control at all. There
// is no fallback on a guessed account.
export type HermesMailboxRuntimeIdentity =
  | {
      kind: 'unknown';
      // Why, so the screen and a reviewer can tell these apart.
      // 'mismatch' is the dangerous one: a central connection exists and no
      // native account answers to it.
      reason: 'loading' | 'notConfigured' | 'unreadable' | 'mismatch';
    }
  | {
      kind: 'known';
      // Opaque, from the central reader. Kept so a caller can tell one bound
      // mailbox from another.
      connectionId: string;
      connectedAccountId: string;
      // The exact handle of that account. The only address this screen ever
      // puts in `from`.
      mailboxAddress: string;
      // Declared on the native account and proven by nothing the server
      // publishes, so they are presented as unverified rather than authorised.
      unverifiedAliases: string[];
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

    const { data, loading, error } = useQuery<{
      hermesConnectionsV4: unknown;
    }>(HERMES_CONNECTIONS_V4, {
      // A point-in-time fact about a binding that can be rotated.
      fetchPolicy: 'no-cache',
      notifyOnNetworkStatusChange: true,
    });

    const identity = useMemo<HermesMailboxRuntimeIdentity>(() => {
      if (loading || !isDefined(accounts)) {
        return { kind: 'unknown', reason: 'loading' };
      }

      if (isDefined(error)) {
        const failure = readHermesMailboxRuntimeFailure(error);

        return {
          kind: 'unknown',
          reason:
            failure.kind === 'notConfigured' ? 'notConfigured' : 'unreadable',
        };
      }

      const connection = readHermesMailboxRuntimeMailConnection(
        data?.hermesConnectionsV4,
      );

      if (connection.kind === 'notConfigured') {
        return { kind: 'unknown', reason: 'notConfigured' };
      }

      if (connection.kind === 'unreadable') {
        return { kind: 'unknown', reason: 'unreadable' };
      }

      // Only the account the central connection names. Not the first, not the
      // newest, and never one picked because its address looks right.
      const account = accounts.find(
        (entry) => entry.id === connection.value.connectedAccountId,
      );

      if (account === undefined || isDefined(account.archivedAt)) {
        return { kind: 'unknown', reason: 'mismatch' };
      }

      const mailboxAddress = normalizeHermesMailboxEmail(account.handle);

      if (mailboxAddress === null) {
        return { kind: 'unknown', reason: 'mismatch' };
      }

      const centralHandle = normalizeHermesMailboxEmail(
        connection.value.handle,
      );

      // Both sides know the address and they disagree: the binding moved under
      // us, or the account was renamed. Neither one is picked.
      if (centralHandle !== null && centralHandle !== mailboxAddress) {
        return { kind: 'unknown', reason: 'mismatch' };
      }

      return {
        kind: 'known',
        connectionId: connection.value.connectionId,
        connectedAccountId: connection.value.connectedAccountId,
        mailboxAddress,
        unverifiedAliases: (account.handleAliases ?? [])
          .map((alias) => normalizeHermesMailboxEmail(alias))
          .filter(
            (alias): alias is string =>
              alias !== null && alias !== mailboxAddress,
          ),
      };
    }, [accounts, data, error, loading]);

    const readAuthority = useCallback(
      (email: string | null): HermesMailboxSenderAuthority => {
        const normalized = normalizeHermesMailboxEmail(email);

        if (identity.kind === 'unknown' || normalized === null) {
          return { kind: 'refused', reason: 'unknown' };
        }

        if (normalized === identity.mailboxAddress) {
          return { kind: 'mailbox' };
        }

        // No operation publishes the verified alias list, so an alias declared
        // on the native account is shown as unchecked — never as authorised.
        // 'authorizedAlias' is therefore never returned by this screen.
        if (identity.unverifiedAliases.includes(normalized)) {
          return { kind: 'refused', reason: 'unknown' };
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
