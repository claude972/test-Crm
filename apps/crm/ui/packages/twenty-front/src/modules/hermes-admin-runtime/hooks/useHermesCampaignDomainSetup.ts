import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { type GraphQLFormattedError } from 'graphql';
import { isNonEmptyString } from '@sniptt/guards';
import { useCallback, useState } from 'react';

import { HERMES_CREATE_EMAILING_DOMAIN } from '@/hermes-admin-runtime/graphql/metadata-mutations/hermesCreateEmailingDomain';

// What a campaign-domain recording attempt ended as.
//
// 'recorded-unverified' is the honest success: the server holds a record for
// the domain, and nothing has verified it. Recording is not verifying, and the
// verdict is the server's. 'recorded-not-reread' is that same accepted write
// whose domain list re-read failed: the record exists and must not be created
// again. 'write-unknown' is a request whose answer never arrived or carried no
// code proving a refusal BEFORE the write, so the server may have applied it
// and no re-emission is offered. 'unconfirmed' is an answer we cannot read.
export type HermesCampaignDomainOutcome =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'recorded-unverified'; domain: string }
  | { kind: 'recorded-not-reread'; domain: string }
  | { kind: 'rereading'; domain: string }
  | { kind: 'write-unknown'; reason: string | null; listReread: boolean }
  | { kind: 'refused'; reason: string | null }
  | { kind: 'unconfirmed' };

const readErrorMessage = (error: unknown): string | null =>
  error instanceof Error ? error.message : null;

// The ONLY codes accepted as proof the write was REFUSED, for the same reason
// the native mailbox save accepts exactly these: each is raised before the
// resolver's method body runs, because the guards and the validation pipe run
// first. Every other code — INTERNAL_SERVER_ERROR above all — can follow an
// applied write, so it proves nothing and leaves a possible duplicate.
const PRE_WRITE_REFUSAL_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_USER_INPUT',
  'NOT_FOUND',
];

// The top-level extensions code only: a subCode is a module's own label and
// does not say where the check ran.
const isPreWriteRefusalCode = (
  graphQLError: GraphQLFormattedError,
): boolean => {
  const code = graphQLError.extensions?.code;

  return typeof code === 'string' && PRE_WRITE_REFUSAL_CODES.includes(code);
};

// A refusal must be PROVEN: every error in the answer has to be on that list.
// One unplaceable or missing code leaves the outcome unknown.
const isProvenPreWriteRefusal = (error: unknown): boolean =>
  CombinedGraphQLErrors.is(error) &&
  error.errors.length > 0 &&
  error.errors.every(isPreWriteRefusalCode);

type UseHermesCampaignDomainSetupProps = {
  // Re-reads the domain list the centre displays. It throws, and this hook
  // decides what a failed re-read means for a record that already exists.
  refetchDomains: () => Promise<unknown>;
};

export const useHermesCampaignDomainSetup = ({
  refetchDomains,
}: UseHermesCampaignDomainSetupProps) => {
  const [outcome, setOutcome] = useState<HermesCampaignDomainOutcome>({
    kind: 'idle',
  });

  const [createEmailingDomain, { loading }] = useMutation(
    HERMES_CREATE_EMAILING_DOMAIN,
    // An accepted create that we replay becomes a second record for the same
    // domain. The transport never retries this on its own.
    { context: { skipRetry: true } },
  );

  const recordDomain = useCallback(
    async (domain: string): Promise<void> => {
      if (!isNonEmptyString(domain)) {
        setOutcome({ kind: 'unconfirmed' });

        return;
      }

      setOutcome({ kind: 'recording' });

      // The mutation is awaited in a try of its OWN, so no later failure can
      // be mistaken for the server's answer about the write.
      let recordedDomain: string | null = null;

      try {
        const { data } = await createEmailingDomain({
          variables: { input: { domain } },
        });

        const created = (
          data as { createEmailingDomain?: { domain?: unknown } } | null
        )?.createEmailingDomain;

        recordedDomain =
          typeof created?.domain === 'string' ? created.domain : null;
      } catch (error) {
        setOutcome(
          isProvenPreWriteRefusal(error)
            ? { kind: 'refused', reason: readErrorMessage(error) }
            : {
                kind: 'write-unknown',
                reason: readErrorMessage(error),
                listReread: false,
              },
        );

        return;
      }

      // An answer we cannot read a domain out of settles nothing: the record
      // may exist. Saying so beats inventing either outcome.
      if (recordedDomain === null) {
        setOutcome({ kind: 'unconfirmed' });

        return;
      }

      // From here the write is ACCEPTED. A failed re-read is reported as a
      // stale list, never as a refusal, and the record is never offered for
      // creation again.
      try {
        await refetchDomains();
        setOutcome({ kind: 'recorded-unverified', domain: recordedDomain });
      } catch {
        setOutcome({ kind: 'recorded-not-reread', domain: recordedDomain });
      }
    },
    [createEmailingDomain, refetchDomains],
  );

  // The only recovery offered for an accepted write whose re-read failed AND
  // for a write whose answer was lost. It re-reads and never writes:
  // re-emitting could create the very duplicate at issue.
  const retryDomainsRead = useCallback(async (): Promise<void> => {
    if (outcome.kind === 'write-unknown') {
      try {
        await refetchDomains();
        setOutcome({ ...outcome, listReread: true });
      } catch {
        setOutcome({ ...outcome, listReread: false });
      }

      return;
    }

    if (outcome.kind !== 'recorded-not-reread') {
      return;
    }

    const pending = outcome.domain;
    setOutcome({ kind: 'rereading', domain: pending });

    try {
      await refetchDomains();
      setOutcome({ kind: 'recorded-unverified', domain: pending });
    } catch {
      setOutcome({ kind: 'recorded-not-reread', domain: pending });
    }
  }, [outcome, refetchDomains]);

  return { outcome, loading, recordDomain, retryDomainsRead };
};
