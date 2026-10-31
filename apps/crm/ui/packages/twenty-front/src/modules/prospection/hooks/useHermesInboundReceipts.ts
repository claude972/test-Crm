import { useQuery } from '@apollo/client/react';

import { HERMES_INBOUND_RECEIPTS } from '@/prospection/graphql/metadata-queries/hermesInboundReceipts';
import { type HermesInboundReceiptsReadState } from '@/prospection/types/HermesInboundClassification';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesInboundReceipts } from '@/prospection/utils/readHermesInboundReceipts';
import { isDefined } from 'kovaa-lab-shared/utils';

// The bridge receipts this company holds: HeyForm answers and Cal.diy
// bookings, each with the canonical identifier its provider console shows.
//
// No argument, so nothing selects a company or a connection. A denial stays a
// denial and never becomes an empty list.
export const useHermesInboundReceipts = (): HermesInboundReceiptsReadState => {
  const { data, loading, error } = useQuery<{
    hermesInboundReceipts: unknown;
  }>(HERMES_INBOUND_RECEIPTS, {
    // A point-in-time read of stored records. A cached page would keep showing
    // a receipt after somebody edited or removed it.
    fetchPolicy: 'network-only',
  });

  if (loading) {
    return { kind: 'loading' };
  }

  if (isDefined(error)) {
    return readHermesCallFailure(error).kind === 'denied'
      ? { kind: 'denied' }
      : { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  return readHermesInboundReceipts(data?.hermesInboundReceipts);
};
