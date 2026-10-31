import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { v4 } from 'uuid';

import { HERMES_RUNTIME_CREATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeCreateCampaign';
import { HERMES_RUNTIME_CAMPAIGN_LIST } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignList';
import { readRuntimeCampaignState } from '@/hermes-campaigns-runtime/utils/readRuntimeCampaign';
import { readRuntimeFailure } from '@/hermes-campaigns-runtime/utils/readRuntimeFailure';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { type HermesCampaignListEntry } from '@/hermes-campaigns-ui/types/HermesCampaignListEntry';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

// How many campaigns the list reads in one page.
export const HERMES_RUNTIME_CAMPAIGN_PAGE_SIZE = 50;

// How creating a campaign went. `unconfirmed` exists for the same reason it
// does everywhere else here: a create whose answer never arrived may well
// have created the campaign, and pressing again on a guess is how a
// workspace ends up with two of them. The id is minted client side, so the
// honest recovery is to reload the list and look.
export type HermesCampaignCreateState =
  | { kind: 'idle' }
  | { kind: 'creating' }
  | { kind: 'created'; campaignId: string }
  | { kind: 'failed'; reasonCode: string | null; reason: string | null }
  | { kind: 'unconfirmed'; reasonCode: string | null; reason: string | null };

type CampaignListNode = {
  id?: string | null;
  name?: string | null;
  subject?: string | null;
  status?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
  sentCount?: number | null;
  failedCount?: number | null;
};

type CampaignListQueryResult = {
  messageCampaigns?: {
    edges?: ({ node?: CampaignListNode | null } | null)[] | null;
    pageInfo?: {
      hasNextPage?: boolean | null;
      endCursor?: string | null;
    } | null;
    totalCount?: number | null;
  } | null;
};

type CreateCampaignMutationResult = {
  createMessageCampaign: { id?: string | null } | null;
};

type CreateCampaignMutationVariables = {
  input: { id: string; name: string };
};

// Only a number is a figure. Anything else is nothing published, which is not
// zero.
const readCount = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const readText = (value: string | null | undefined): string | null =>
  isNonEmptyString(value) ? value : null;

// The workspace's campaigns, plus creating one.
//
// The list is a read and the create emits nothing: a new campaign is an empty
// draft. Neither touches a transport.
export const useHermesRuntimeCampaignList = () => {
  const isMessageCampaignEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );
  const apolloCoreClient = useApolloCoreClient();

  const { data, loading, error, refetch, fetchMore } =
    useQuery<CampaignListQueryResult>(
      HERMES_RUNTIME_CAMPAIGN_LIST,
      {
        variables: {
          orderBy: [{ createdAt: 'DescNullsLast' }],
          limit: HERMES_RUNTIME_CAMPAIGN_PAGE_SIZE,
        },
        client: apolloCoreClient,
        skip: !isMessageCampaignEnabled,
        fetchPolicy: 'cache-and-network',
        notifyOnNetworkStatusChange: true,
      },
    );

  const [createCampaign] = useMutation<
    CreateCampaignMutationResult,
    CreateCampaignMutationVariables
  >(HERMES_RUNTIME_CREATE_CAMPAIGN, {
    client: apolloCoreClient,
    context: { skipRetry: true },
  });

  const [createState, setCreateState] = useState<HermesCampaignCreateState>({
    kind: 'idle',
  });

  // The creation whose outcome is not known, kept so a retry reuses its id.
  //
  // Minting a fresh uuid on a second press is how one intention becomes two
  // campaigns: the first call may well have succeeded. The same id is the
  // same campaign, so replaying it is safe; a new one is not.
  const pendingAttemptRef = useRef<{ campaignId: string; name: string } | null>(
    null,
  );

  const entries: HermesCampaignListEntry[] = useMemo(() => {
    const edges = data?.messageCampaigns?.edges ?? [];

    return edges.flatMap((edge) => {
      const node = edge?.node;

      // A row with no id cannot be opened, so it is not offered.
      if (!isDefined(node) || !isNonEmptyString(node.id)) {
        return [];
      }

      const publishedStatus = readText(node.status);
      const state = isDefined(publishedStatus)
        ? readRuntimeCampaignState(publishedStatus)
        : null;

      return [
        {
          id: node.id,
          name: readText(node.name),
          subject: readText(node.subject),
          state,
          // A status outside the contract is named rather than rounded into
          // one of the five states.
          unknownStatus: isDefined(state) ? null : publishedStatus,
          scheduledAt: readText(node.scheduledAt),
          sentAt: readText(node.sentAt),
          createdAt: readText(node.createdAt),
          sentCount: readCount(node.sentCount),
          failedCount: readCount(node.failedCount),
        },
      ];
    });
  }, [data]);

  const campaignsLoad: HermesCampaignLoad<HermesCampaignListEntry[]> =
    !isMessageCampaignEnabled
      ? {
          kind: 'not-configured',
          detail:
            'The native campaign engine is not enabled on this workspace.',
        }
      : loading && !isDefined(data)
        ? { kind: 'loading' }
        : isDefined(error)
          ? { kind: 'failed', ...readRuntimeFailure(error) }
          : entries.length === 0
            ? { kind: 'empty' }
            : { kind: 'ready', value: entries };

  // Creates an empty draft and hands back its id so the caller can open it.
  //
  // The id is minted here, before the call, which is what makes a repeated
  // press safe: the same id is the same campaign.
  const onCreateCampaign = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();

      if (trimmed.length === 0) {
        setCreateState({
          kind: 'failed',
          reasonCode: 'CAMPAIGN_NAME_REQUIRED',
          reason: null,
        });

        return null;
      }

      // A retry of an unresolved creation of the same campaign reuses its id.
      // Anything else is a new campaign and gets a new one.
      const pending = pendingAttemptRef.current;
      const campaignId =
        isDefined(pending) && pending.name === trimmed
          ? pending.campaignId
          : v4();

      pendingAttemptRef.current = { campaignId, name: trimmed };

      setCreateState({ kind: 'creating' });

      try {
        const { data: created } = await createCampaign({
          variables: { input: { id: campaignId, name: trimmed } },
        });

        const createdId = created?.createMessageCampaign?.id;

        if (!isNonEmptyString(createdId)) {
          // It may exist already. Saying "failed" would invite a second
          // press, and a guessed success would open a campaign that is not
          // there.
          setCreateState({
            kind: 'unconfirmed',
            reasonCode: 'SERVER_ANSWER_UNREADABLE',
            reason: null,
          });
          await refetch().catch(() => undefined);

          return null;
        }

        // Settled: this attempt is finished and must not be replayed.
        pendingAttemptRef.current = null;
        setCreateState({ kind: 'created', campaignId: createdId });
        await refetch().catch(() => undefined);

        return createdId;
      } catch (error_) {
        const classified = readHermesCallFailure(error_);
        const failure = readRuntimeFailure(error_);

        // A refusal the server reasoned about is a refusal; anything else
        // leaves the outcome unknown and is not retried on its own.
        const isRefusal =
          classified.kind === 'denied' ||
          classified.kind === 'rejected-input' ||
          classified.kind === 'conflict';

        // A refusal is settled: nothing was created, so the id is dropped.
        // An unknown outcome keeps it, so a retry cannot duplicate.
        if (isRefusal) {
          pendingAttemptRef.current = null;
        }

        setCreateState(
          isRefusal
            ? { kind: 'failed', ...failure }
            : { kind: 'unconfirmed', ...failure },
        );
        await refetch().catch(() => undefined);

        return null;
      }
    },
    [createCampaign, refetch],
  );

  // The unresolved creation is acknowledged by re-reading the list: that is
  // the only way to find out whether the campaign exists. Pressing create
  // again on a guess is exactly what must not happen, so the control stays
  // shut until this is done.
  const onRecheckAfterUncertainCreation = useCallback(async () => {
    await refetch().catch(() => undefined);

    // The id is kept: if the campaign did not in fact exist, the next attempt
    // replays the same one rather than minting a second.
    setCreateState({ kind: 'idle' });
  }, [refetch]);

  const pageInfo = data?.messageCampaigns?.pageInfo;
  const hasNextPage = pageInfo?.hasNextPage === true;
  const endCursor = isNonEmptyString(pageInfo?.endCursor)
    ? pageInfo.endCursor
    : null;

  // Reads the next page and appends it. Without this the list stopped at the
  // page size with no way past it, so a company with more campaigns than that
  // simply could not reach them.
  const onLoadMore = useCallback(async () => {
    if (!hasNextPage || !isDefined(endCursor)) {
      return;
    }

    await fetchMore({
      variables: { lastCursor: endCursor },
      updateQuery: (previous, { fetchMoreResult }) => {
        const nextEdges = fetchMoreResult?.messageCampaigns?.edges ?? [];

        if (nextEdges.length === 0) {
          return previous;
        }

        return {
          messageCampaigns: {
            ...previous.messageCampaigns,
            ...fetchMoreResult.messageCampaigns,
            edges: [
              ...(previous.messageCampaigns?.edges ?? []),
              ...nextEdges,
            ],
          },
        };
      },
    }).catch(() => undefined);
  }, [fetchMore, hasNextPage, endCursor]);

  return {
    campaignsLoad,
    // Null when the server published no readable figure, which is not zero.
    totalCount: data?.messageCampaigns?.totalCount ?? null,
    createState,
    onCreateCampaign,
    // Shut while a creation is in flight, and while its outcome is unknown:
    // a second press then could create a second campaign.
    isCreateBlocked:
      createState.kind === 'creating' || createState.kind === 'unconfirmed',
    onRecheckAfterUncertainCreation,
    hasNextPage,
    isLoadingMore: loading && isDefined(data),
    onLoadMore,
    onRetry: () => {
      void refetch();
    },
  };
};
