import { useQuery } from '@apollo/client/react';

import { HERMES_INTAKE_STATE } from '@/prospection/graphql/metadata-queries/hermesIntakeState';
import { type HermesIntakeReadState } from '@/prospection/types/HermesIntakeState';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesIntakeState } from '@/prospection/utils/readHermesIntakeState';
import { isDefined } from 'kovaa-lab-shared/utils';

// The real entry point state, for the current workspace only.
//
// There is still no HTTP client here, and there must not be one: the intake
// itself — POST /webhooks/hermes/intake/:connectionId, HMAC plus a nonce with
// a TTL, delegated per structure — is server to server. The browser is not a
// party to it, cannot sign for it, and must never hold the key that would let
// it. Nothing here posts, retries or tests it.
export const useHermesIntakeState = (): HermesIntakeReadState => {
  const { data, loading, error } = useQuery<{ hermesIntakeState: unknown }>(
    HERMES_INTAKE_STATE,
    {
      // A point-in-time fact about a remote entry point. A cached answer would
      // keep showing it accepting after it stopped.
      fetchPolicy: 'network-only',
    },
  );

  if (loading) {
    return { kind: 'loading' };
  }

  if (isDefined(error)) {
    return readHermesCallFailure(error).kind === 'denied'
      ? { kind: 'denied' }
      : { kind: 'unreadable', problem: 'unexpected-shape' };
  }

  return readHermesIntakeState(data?.hermesIntakeState);
};
