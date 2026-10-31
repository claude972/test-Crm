import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import { type HermesNativeConnectedAccount } from '@/hermes-admin-ui/types/HermesConnectionForm';
import { GET_MY_CONNECTED_ACCOUNTS } from '@/settings/accounts/graphql/queries/getMyConnectedAccounts';

type NativeAccountRow = {
  id: string;
  handle?: string | null;
  provider?: string | null;
  name?: string | null;
  archivedAt?: string | null;
  authFailedAt?: string | null;
};

// What the read of the native connected accounts actually established.
//
// The three are kept apart on purpose. This hook used to return a bare array
// and swallow `error`, so a failed read produced `[]` with loading false and
// the screen said the company had no native account — a verdict the server
// never gave. An absence is now only ever reported when the server reported
// one, and a failure says it failed and is answered by a re-read.
export type HermesNativeAccountsRead =
  | { kind: 'loading' }
  | { kind: 'reported'; accounts: readonly HermesNativeConnectedAccount[] }
  | { kind: 'unreadable'; reason: string | null };

// The native connected accounts a mail link may be bound to.
//
// Mail runs on an account the operator already connected, whose IMAP and SMTP
// credentials are encrypted in the native store. This hook therefore offers a
// CHOICE among those accounts and no credential field at all: a mailbox
// password form here would be the second credential store the contract forbids.
//
// Only IMAP_SMTP_CALDAV accounts are offered, because that is the provider the
// mail binding accepts. An archived account is left out: it cannot be bound.
// An account whose authentication has failed is kept, because the server is the
// one that decides whether the binding holds, and hiding it would leave the
// operator unable to see why their choice is missing.
export const useHermesRuntimeNativeAccounts = (): {
  read: HermesNativeAccountsRead;
  // The only recovery offered for a read that failed. Nothing here guesses
  // what the server holds in its place.
  rereadAccounts: () => Promise<unknown>;
} => {
  const { data, loading, error, refetch } = useQuery<{
    myConnectedAccounts: NativeAccountRow[] | null;
  }>(GET_MY_CONNECTED_ACCOUNTS, {
    errorPolicy: 'all',
    // So a re-read shows as in flight rather than as a settled answer.
    notifyOnNetworkStatusChange: true,
  });

  const read = useMemo<HermesNativeAccountsRead>(() => {
    if (loading) {
      return { kind: 'loading' };
    }

    // `errorPolicy: 'all'` delivers partial data ALONGSIDE an error. A partial
    // list is not the list, so an error makes the read unreadable whatever came
    // with it: showing part of it as all of it invents a verdict just as much
    // as showing none of it as none.
    if (isDefined(error)) {
      return {
        kind: 'unreadable',
        reason: error.message.trim().length > 0 ? error.message : null,
      };
    }

    const rows = data?.myConnectedAccounts;

    // Not an array is not an empty list: it is an answer in a shape this
    // contract does not describe.
    if (!Array.isArray(rows)) {
      return { kind: 'unreadable', reason: null };
    }

    return {
      kind: 'reported',
      accounts: rows
        .filter(
          (row) =>
            row.provider === ConnectedAccountProvider.IMAP_SMTP_CALDAV &&
            (row.archivedAt === null || row.archivedAt === undefined),
        )
        .map((row) => ({
          id: row.id,
          // The address the SERVER attaches to the account. It is a consequence
          // of the choice, never an input, and never derived from the id.
          address: row.handle ?? null,
          label: row.name ?? null,
        })),
    };
  }, [data, error, loading]);

  return { read, rereadAccounts: refetch };
};
