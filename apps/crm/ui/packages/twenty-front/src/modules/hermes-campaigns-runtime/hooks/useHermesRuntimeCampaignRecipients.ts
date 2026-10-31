import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { HERMES_RUNTIME_CAMPAIGN_RECIPIENTS } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecipients';
import { type HermesCampaignPreviewRecipient } from '@/hermes-campaigns-ui/types/HermesCampaignPreviewRecipient';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// How many list members are offered for a preview. A preview is a spot check
// on one person, not a way to page through the audience, and the audience
// figures come from the server's own count rather than from this page.
export const HERMES_RUNTIME_PREVIEW_RECIPIENT_LIMIT = 50;

type RecipientsQueryResult = {
  messageListMembers?: {
    edges?:
      | {
          node?: {
            id?: string | null;
            personId?: string | null;
            person?: {
              id?: string | null;
              name?: {
                firstName?: string | null;
                lastName?: string | null;
              } | null;
              emails?: { primaryEmail?: string | null } | null;
            } | null;
          } | null;
        }[]
      | null;
    totalCount?: number | null;
  } | null;
};

// A person's name as one string, or null when neither part was published. An
// empty string would render as a nameless row that looks like a defect.
const readName = (
  name: { firstName?: string | null; lastName?: string | null } | null,
): string | null => {
  if (!isDefined(name)) {
    return null;
  }

  const joined = `${name.firstName?.trim() ?? ''} ${name.lastName?.trim() ?? ''}`.trim();

  return isNonEmptyString(joined) ? joined : null;
};

// The recipients on a campaign's audience list, for the preview picker.
//
// Skipped entirely when the campaign carries no list: an audience that was
// never attached has no members, and asking for the members of nothing would
// return an empty list that reads like an empty audience.
export const useHermesRuntimeCampaignRecipients = ({
  listId,
}: {
  listId: string | null;
}) => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch } = useQuery<RecipientsQueryResult>(
    HERMES_RUNTIME_CAMPAIGN_RECIPIENTS,
    {
      variables: {
        listId,
        limit: HERMES_RUNTIME_PREVIEW_RECIPIENT_LIMIT,
      },
      client: apolloCoreClient,
      skip: !isNonEmptyString(listId),
      fetchPolicy: 'cache-and-network',
    },
  );

  const recipients: HermesCampaignPreviewRecipient[] = useMemo(() => {
    const edges = data?.messageListMembers?.edges ?? [];

    return edges.flatMap((edge) => {
      const node = edge?.node;

      // The preview operation is asked for a `personId`, so a membership row
      // that resolves to no person cannot be offered: there would be nobody
      // to render the content against. It is dropped rather than offered
      // under its membership id, which the operation would reject.
      const personId = isNonEmptyString(node?.personId)
        ? node.personId
        : isNonEmptyString(node?.person?.id)
          ? node.person.id
          : null;

      if (!isDefined(node) || !isDefined(personId)) {
        return [];
      }

      return [
        {
          id: personId,
          label: readName(node.person?.name ?? null),
          address: isNonEmptyString(node.person?.emails?.primaryEmail)
            ? node.person.emails.primaryEmail
            : null,
        },
      ];
    });
  }, [data]);

  return {
    recipients,
    // Null when the server published no readable figure, which is not zero.
    totalCount: data?.messageListMembers?.totalCount ?? null,
    loading,
    error,
    refetch,
  };
};
