import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import { v4 } from 'uuid';

import { HERMES_RUNTIME_CREATE_CAMPAIGN } from '@/hermes-campaigns-runtime/graphql/mutations/hermesRuntimeCreateCampaign';
import { HERMES_RUNTIME_CAMPAIGN_LIST } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignList';
import { HERMES_RUNTIME_CAMPAIGN_RECORD } from '@/hermes-campaigns-runtime/graphql/queries/hermesRuntimeCampaignRecord';
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
  | { kind: 'unconfirmed'; reasonCode: string | null; reason: string | null }
  // Reconciling: the campaign is being looked up by its id to find out what
  // actually happened.
  | { kind: 'reconciling' }
  // Reconciled and it is not there. The id is kept, so the next attempt
  // replays it rather than minting a second one, and creating reopens.
  | { kind: 'absent' }
  // The lookup itself failed, so the outcome is still unknown. Creating stays
  // shut: this is not permission to press again.
  | {
      kind: 'reconcileFailed';
      reasonCode: string | null;
      reason: string | null;
    };

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
        // A conflict is NOT a settled refusal here. It is the server saying
        // something is already there under this id — which is precisely the
        // evidence that a previous write landed. Dropping the id on a
        // conflict is how a second campaign gets created later, so it is
        // kept and reconciled like any other unknown outcome.
        const isSettledRefusal =
          classified.kind === 'denied' || classified.kind === 'rejected-input';

        // A settled refusal means nothing was created, so the id is dropped.
        // Everything else keeps it, so a retry cannot duplicate.
        if (isSettledRefusal) {
          pendingAttemptRef.current = null;
        }

        setCreateState(
          isSettledRefusal
            ? { kind: 'failed', ...failure }
            : { kind: 'unconfirmed', ...failure },
        );
        await refetch().catch(() => undefined);

        return null;
      }
    },
    [createCampaign, refetch],
  );

  // Reconciles an unresolved creation by looking the campaign up by its own
  // id, and says which case it is.
  //
  // Re-reading the list and returning to idle was not enough: it swallowed
  // any error and left the operator to guess, which is the guessing this
  // defect is about. The id is known, so the question is answerable.
  const onRecheckAfterUncertainCreation = useCallback(async () => {
    const pending = pendingAttemptRef.current;

    if (!isDefined(pending)) {
      setCreateState({ kind: 'idle' });

      return;
    }

    setCreateState({ kind: 'reconciling' });

    try {
      const { data: found } = await apolloCoreClient.query<{
        messageCampaign?: { id?: string | null } | null;
      }>({
        query: HERMES_RUNTIME_CAMPAIGN_RECORD,
        variables: { campaignId: pending.campaignId },
        // A point-in-time fact. The cache must not answer this.
        fetchPolicy: 'no-cache',
      });

      await refetch().catch(() => undefined);

      const existingId = found?.messageCampaign?.id;

      if (isNonEmptyString(existingId)) {
        // It was created after all. Settled, so the id is released and the
        // campaign can be opened.
        pendingAttemptRef.current = null;
        setCreateState({ kind: 'created', campaignId: existingId });

        return;
      }

      // Genuinely absent. The id is deliberately kept, so a further attempt
      // replays it and still cannot produce two campaigns.
      setCreateState({ kind: 'absent' });
    } catch (error_) {
      // The lookup failed, so nothing was learned. Reported rather than
      // swallowed, and creating stays shut.
      setCreateState({
        kind: 'reconcileFailed',
        ...readRuntimeFailure(error_),
      });
    }
  }, [apolloCoreClient, refetch]);

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
    // Shut while the outcome is unknown, while it is being reconciled, and
    // when the reconciliation itself failed. Reopened by 'absent', which is
    // a reconciled answer rather than a guess.
    isCreateBlocked:
      createState.kind === 'creating' ||
      createState.kind === 'unconfirmed' ||
      createState.kind === 'reconciling' ||
      createState.kind === 'reconcileFailed',
    onRecheckAfterUncertainCreation,
    hasNextPage,
    isLoadingMore: loading && isDefined(data),
    onLoadMore,
    onRetry: () => {
      void refetch();
    },
  };
};
