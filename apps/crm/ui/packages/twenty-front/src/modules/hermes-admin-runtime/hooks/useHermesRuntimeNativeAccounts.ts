import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { ConnectedAccountProvider } from 'kovaa-lab-shared/types';

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

// The native connected accounts a mail link may be bound to.
//
// Mail runs on an account the operator already connected, whose IMAP and SMTP
// credentials are encrypted in the native store. This screen therefore offers
// a CHOICE among those accounts and no credential field at all: a mailbox
// password form here would be the second credential store the contract
// forbids.
//
// Only IMAP_SMTP_CALDAV accounts are offered, because that is the provider
// the mail binding accepts. An archived account is left out: it cannot be
// bound. An account whose authentication has failed is kept, because the
// server is the one that decides whether the binding holds, and hiding it
// would leave the operator unable to see why their choice is missing.
export const useHermesRuntimeNativeAccounts = (): {
  nativeAccounts: readonly HermesNativeConnectedAccount[];
  isLoading: boolean;
} => {
  const { data, loading } = useQuery<{
    myConnectedAccounts: NativeAccountRow[] | null;
  }>(GET_MY_CONNECTED_ACCOUNTS, { errorPolicy: 'all' });

  const nativeAccounts = useMemo<readonly HermesNativeConnectedAccount[]>(() => {
    const rows = data?.myConnectedAccounts;

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
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
      }));
  }, [data]);

  return { nativeAccounts, isLoading: loading };
};
