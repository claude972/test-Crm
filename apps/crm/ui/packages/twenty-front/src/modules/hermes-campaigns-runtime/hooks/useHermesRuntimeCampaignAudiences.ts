import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_RUNTIME_CAMPAIGN_AUDIENCES } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignAudiences';
import { readRuntimeFailure } from '@/hermes-campaigns-runtime/utils/readRuntimeFailure';
import { type HermesCampaignAudienceOption } from '@/hermes-campaigns-ui/types/HermesCampaignAudienceOption';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// How many audience lists the picker offers in one page.
export const HERMES_RUNTIME_AUDIENCE_PAGE_SIZE = 50;

type AudiencesQueryResult = {
  messageLists?: {
    edges?:
      | ({
          node?: {
            id?: string | null;
            name?: string | null;
            description?: string | null;
          } | null;
        } | null)[]
      | null;
    totalCount?: number | null;
  } | null;
};

const readText = (value: string | null | undefined): string | null =>
  isNonEmptyString(value) ? value : null;

// The audience lists this company holds, so a campaign can be given one.
//
// A read. Choosing a list records its id on the campaign and nothing else:
// the server re-resolves the audience from it under its own rights and the
// standing objections, and keeps only the rows whose professional purpose and
// company context were recorded at qualification. No count and no eligibility
// is computed here.
export const useHermesRuntimeCampaignAudiences = ({
  isEngineEnabled,
}: {
  isEngineEnabled: boolean;
}) => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch } = useQuery<AudiencesQueryResult>(
    HERMES_RUNTIME_CAMPAIGN_AUDIENCES,
    {
      variables: {
        orderBy: [{ createdAt: 'DescNullsLast' }],
        limit: HERMES_RUNTIME_AUDIENCE_PAGE_SIZE,
      },
      client: apolloCoreClient,
      skip: !isEngineEnabled,
      fetchPolicy: 'cache-and-network',
    },
  );

  const audiences: HermesCampaignAudienceOption[] = useMemo(() => {
    const edges = data?.messageLists?.edges ?? [];

    return edges.flatMap((edge) => {
      const node = edge?.node;

      // A list with no id cannot be recorded on a campaign, so it is not
      // offered as a choice.
      if (!isDefined(node) || !isNonEmptyString(node.id)) {
        return [];
      }

      return [
        {
          id: node.id,
          name: readText(node.name),
          description: readText(node.description),
        },
      ];
    });
  }, [data]);

  const audiencesLoad: HermesCampaignLoad<HermesCampaignAudienceOption[]> =
    !isEngineEnabled
      ? {
          kind: 'not-configured',
          detail:
            'The native campaign engine is not enabled on this workspace.',
        }
      : loading && !isDefined(data)
        ? { kind: 'loading' }
        : isDefined(error)
          ? { kind: 'failed', ...readRuntimeFailure(error) }
          : audiences.length === 0
            ? // A company with no list at all. Not a failed read, and not a
              // reason to offer an invented one.
              { kind: 'empty' }
            : { kind: 'ready', value: audiences };

  return {
    audiencesLoad,
    totalCount: data?.messageLists?.totalCount ?? null,
    onRetryAudiences: () => {
      void refetch();
    },
  };
};
