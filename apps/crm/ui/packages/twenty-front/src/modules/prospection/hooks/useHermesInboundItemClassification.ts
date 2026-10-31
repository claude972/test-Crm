import { useQuery } from '@apollo/client/react';

import { HERMES_INBOUND_ITEM_CLASSIFICATION } from '@/prospection/graphql/metadata-queries/hermesInboundItemClassification';
import { type HermesInboundItemReadState } from '@/prospection/types/HermesInboundClassification';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesInboundItemClassification } from '@/prospection/utils/readHermesInboundClassification';
import { isDefined } from 'kovaa-lab-shared/utils';

type HermesInboundItemQuery = {
  // 'HEYFORM' for a form answer, 'CAL_DIY' for a booking. Passed through as
  // the server's own vocabulary: the browser does not translate it into an
  // identifier of its own, which would be a second source of truth.
  provider: string;
  eventId: string;
  // Only meaningful for a booking. Supplied when the caller already holds it;
  // without it the server reports no calendar record rather than guessing one.
  bookingUid?: string;
};

// How the server classified one bridge receipt: where it came from, which
// company it belongs to, and what it already touches in the CRM.
//
// The query is skipped until both required identifiers are present, so a
// half-filled inspector never asks the server to classify nothing and never
// renders a 'not-found' that only means "nothing was asked".
export const useHermesInboundItemClassification = (
  query: HermesInboundItemQuery | null,
): HermesInboundItemReadState => {
  const { data, loading, error } = useQuery<{
    hermesInboundItemClassification: unknown;
  }>(HERMES_INBOUND_ITEM_CLASSIFICATION, {
    variables: {
      provider: query?.provider ?? '',
      eventId: query?.eventId ?? '',
      bookingUid: query?.bookingUid ?? null,
    },
    skip: !isDefined(query),
    // A point-in-time classification of a stored record. A cached answer would
    // keep showing a receipt as intact after somebody edited it.
    fetchPolicy: 'network-only',
  });

  if (!isDefined(query)) {
    return { kind: 'loading' };
  }

  if (loading) {
    return { kind: 'loading' };
  }

  if (isDefined(error)) {
    return readHermesCallFailure(error).kind === 'denied'
      ? { kind: 'denied' }
      : { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  return readHermesInboundItemClassification(
    data?.hermesInboundItemClassification,
  );
};
