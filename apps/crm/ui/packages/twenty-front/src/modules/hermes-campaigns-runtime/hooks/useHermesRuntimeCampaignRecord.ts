import { useQuery } from '@apollo/client/react';
import { isNonEmptyString } from '@sniptt/guards';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { HERMES_RUNTIME_CAMPAIGN_RECORD } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecord';
import { type HermesRuntimeCampaignRecordQuery } from '@/hermes-campaigns-runtime/types/HermesRuntimeCampaignRecord';

// Reads the campaign record from the core workspace schema, which is a
// different endpoint from the emailing engine's own operations, hence the
// explicit client.
export const useHermesRuntimeCampaignRecord = ({
  campaignId,
}: {
  campaignId: string;
}) => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch } =
    useQuery<HermesRuntimeCampaignRecordQuery>(HERMES_RUNTIME_CAMPAIGN_RECORD, {
      variables: { campaignId },
      client: apolloCoreClient,
      skip: !isNonEmptyString(campaignId),
      fetchPolicy: 'cache-and-network',
    });

  return {
    campaign: data?.messageCampaign ?? null,
    loading,
    error,
    refetch,
  };
};
