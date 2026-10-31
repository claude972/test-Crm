import { useQuery } from '@apollo/client/react';

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
export const useHermesScrapingClassification =
  (): HermesScrapingClassificationReadState => {
    const { data, loading, error } = useQuery<{
      hermesScrapingClassification: unknown;
    }>(HERMES_SCRAPING_CLASSIFICATION, {
      // Row outcomes change as an operator qualifies. A cached answer would
      // keep showing rows as pending after they were qualified.
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

    return readHermesScrapingClassification(data?.hermesScrapingClassification);
  };
