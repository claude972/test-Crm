import { useQuery } from '@apollo/client/react';
import { useCallback } from 'react';

import { HERMES_SCRAPING_CLASSIFICATION } from '@/prospection/graphql/metadata-queries/hermesScrapingClassification';
import { type HermesScrapingClassificationReadState } from '@/prospection/types/HermesInboundClassification';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { readHermesScrapingClassification } from '@/prospection/utils/readHermesInboundClassification';
import { isDefined } from 'kovaa-lab-shared/utils';

// How the server classified this company's signed deposits: their provenance,
// their real row outcomes including duplicates, and the records a human
// qualification already linked.
//
// Read-only, and there is no client for the intake itself here: the reception
// — POST /webhooks/hermes/intake/:connectionId, HMAC plus a nonce with a TTL,
// delegated per company — is server to server. The browser is not a party to
// it and must never hold the key that would let it be. Nothing here posts,
// retries, qualifies or tests anything.
export type HermesScrapingClassificationRead = {
  state: HermesScrapingClassificationReadState;
  // Re-reads the classification from the server. `network-only` only stops a
  // cache READ; it never re-runs the query on its own, so a qualification that
  // changes what would be classified has to ask for this explicitly.
  reread: () => void;
};

export const useHermesScrapingClassification =
  (): HermesScrapingClassificationRead => {
    const { data, loading, error, refetch } = useQuery<{
      hermesScrapingClassification: unknown;
    }>(HERMES_SCRAPING_CLASSIFICATION, {
      // Row outcomes change as an operator qualifies. A cached answer would
      // keep showing rows as pending after they were qualified.
      fetchPolicy: 'network-only',
    });

    // A re-read that fails must not look like a classification that came back
    // empty: the error above already turns the next render into 'unreadable'.
    const reread = useCallback(() => {
      void refetch().catch(() => undefined);
    }, [refetch]);

    const state = loading
      ? ({ kind: 'loading' } as const)
      : isDefined(error)
        ? readHermesCallFailure(error).kind === 'denied'
          ? ({ kind: 'denied' } as const)
          : ({ kind: 'unreadable', problem: 'unexpected-shape' } as const)
        : readHermesScrapingClassification(
            data?.hermesScrapingClassification,
          );

    return { state, reread };
  };
