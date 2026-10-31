import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { CANCEL_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/cancelMessageCampaign';
import { SEND_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/sendMessageCampaign';
import { PREVIEW_MESSAGE_CAMPAIGN_SEND } from '@/activities/emails/graphql/metadata-queries/previewMessageCampaignSend';
import { UNSUBSCRIBE_TOPICS } from '@/activities/emails/graphql/metadata-queries/unsubscribeTopics';
import { type HermesCampaignAudience } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import { type HermesCampaignCapabilities } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import { type HermesCampaignContent } from '@/hermes-campaigns-ui/types/HermesCampaignContent';
import {
  type HermesCampaignActionOutcome,
  type HermesCampaignSchedule,
} from '@/hermes-campaigns-ui/types/HermesCampaignJourney';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesCampaignMetric } from '@/hermes-campaigns-ui/types/HermesCampaignResult';
import { type HermesMarketingObjection } from '@/hermes-campaigns-ui/types/HermesMarketingObjection';
import {
  type HermesSenderIdentity,
  type HermesSenderIdentityVerdict,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { useHermesRuntimeCampaignRecord } from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignRecord';
import {
  buildRuntimeAudience,
  type HermesRuntimeAudiencePreview,
} from '@/hermes-campaigns-runtime/utils/buildRuntimeAudience';
import {
  buildRuntimeCapabilities,
  type HermesRuntimeSendBlocker,
} from '@/hermes-campaigns-runtime/utils/buildRuntimeCapabilities';
import { buildRuntimeMarketingObjections } from '@/hermes-campaigns-runtime/utils/buildRuntimeMarketingObjections';
import {
  buildRuntimeSenderIdentities,
  type HermesRuntimeMessageChannel,
} from '@/hermes-campaigns-runtime/utils/buildRuntimeSenderIdentities';
import {
  buildRuntimeScheduleInstant,
  buildRuntimeMetrics,
  readRuntimeCampaignState,
  readRuntimeSchedule,
} from '@/hermes-campaigns-runtime/utils/readRuntimeCampaign';
import { readRuntimeFailure } from '@/hermes-campaigns-runtime/utils/readRuntimeFailure';
import { useProspectionSuppressionRegister } from '@/prospection/hooks/useProspectionSuppressionRegister';
import { GET_MY_MESSAGE_CHANNELS } from '@/settings/accounts/graphql/queries/getMyMessageChannels';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { FeatureFlagKey } from '~/generated-metadata/graphql';

const EMPTY_SCHEDULE: HermesCampaignSchedule = {
  date: '',
  time: '',
  timeZone: '',
};

// The zones the platform knows, offered as a list. Nothing here preselects
// one: the draft starts without a zone, so a moment is only ever recorded in
// a zone somebody chose.
const readSupportedTimeZones = (): string[] => {
  const supportedValuesOf = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;

  if (typeof supportedValuesOf !== 'function') {
    return [];
  }

  try {
    return supportedValuesOf('timeZone');
  } catch {
    return [];
  }
};

const SUPPORTED_TIME_ZONES = readSupportedTimeZones();

type PreviewQueryResult = {
  previewMessageCampaignSend?: {
    audience?: HermesRuntimeAudiencePreview | null;
    blockers?: HermesRuntimeSendBlocker[] | null;
  } | null;
};

// The two mutation answers, typed from their own selection sets. Only the
// presence of the payload is read here — an answer this screen cannot read is
// reported as unreadable rather than as a success — but the shape is written
// out so a change in the document cannot pass silently.
type ScheduleMutationResult = {
  sendMessageCampaign: {
    campaignId: string;
    queuedCount: number;
    audience: {
      totalMembers: number;
      withoutEmail: number;
      duplicateEmails: number;
      hardSuppressed: number;
      globallyUnsubscribed: number;
      topicUnsubscribed: number;
      trackingRefused: number;
      sendable: number;
    };
  } | null;
};

type ScheduleMutationVariables = {
  input: { campaignId: string; scheduledAt: string };
};

type CancelMutationResult = {
  cancelMessageCampaign: {
    campaignId: string;
    canceledMessageCount: number;
  } | null;
};

type CancelMutationVariables = {
  input: { campaignId: string };
};

type ChannelsQueryResult = {
  myMessageChannels?: HermesRuntimeMessageChannel[] | null;
};

type TopicsQueryResult = {
  unsubscribeTopics?: { id: string; name?: string | null }[] | null;
};

// Everything the campaign screen needs, read from the emailing engine the
// workspace already runs.
//
// The screen is told what the server said and nothing else. Every section
// arrives as one of the five load answers, every capability as the server
// published it, and the only two actions wired are the two the schema
// actually exposes without emitting at the moment of the call: recording a
// schedule, and cancelling the departures that are still avoidable.
//
// Deliberately not wired, because wiring them would mean emitting or
// inventing:
//
// - the recipient preview: no operation renders a campaign's subject and body
//   for a recipient, so the preview stays idle and its control stays shut.
// - the synthetic test: `sendMessageCampaignTest` really sends, accepts any
//   address as its destination with no staging restriction, and the screen
//   offers no field where a human could name that destination. No capability
//   is published for it either, so it stays shut with its reason.
// - the immediate send: never wired here, under any condition.
export const useHermesCampaignRuntime = ({
  campaignId,
}: {
  campaignId: string;
}) => {
  const isMessageCampaignEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_MESSAGE_CAMPAIGN_ENABLED,
  );

  const hasCampaignId = isNonEmptyString(campaignId);
  const isEngineReachable = isMessageCampaignEnabled && hasCampaignId;

  const {
    campaign,
    loading: campaignLoading,
    error: campaignError,
    refetch: refetchCampaign,
  } = useHermesRuntimeCampaignRecord({ campaignId });

  // The server's own verdict on whether this campaign may depart, plus the
  // audience it would reach. Read-only: it emits nothing.
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
    refetch: refetchPreview,
  } = useQuery<PreviewQueryResult>(PREVIEW_MESSAGE_CAMPAIGN_SEND, {
    variables: { input: { campaignId } },
    skip: !isEngineReachable,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: channelsData,
    loading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels,
  } = useQuery<ChannelsQueryResult>(GET_MY_MESSAGE_CHANNELS, {
    skip: !isMessageCampaignEnabled,
  });

  const { data: topicsData } = useQuery<TopicsQueryResult>(
    UNSUBSCRIBE_TOPICS,
    { skip: !isMessageCampaignEnabled },
  );

  const {
    entriesByEmail,
    coverage: registerCoverage,
    loading: registerLoading,
  } = useProspectionSuppressionRegister();

  const [scheduleCampaign] = useMutation<
    ScheduleMutationResult,
    ScheduleMutationVariables
  >(SEND_MESSAGE_CAMPAIGN);
  const [cancelCampaign] = useMutation<
    CancelMutationResult,
    CancelMutationVariables
  >(CANCEL_MESSAGE_CAMPAIGN);

  const [contentDraft, setContentDraft] = useState<HermesCampaignContent | null>(
    null,
  );
  const [scheduleDraftOverride, setScheduleDraftOverride] =
    useState<HermesCampaignSchedule | null>(null);
  const [selectedIdentityOverride, setSelectedIdentityOverride] = useState<
    string | null
  >(null);
  const [actionOutcome, setActionOutcome] =
    useState<HermesCampaignActionOutcome | null>(null);

  // Null when the preview did not answer at all, which is not an empty list
  // of blockers.
  const blockers = isDefined(previewError)
    ? null
    : (previewData?.previewMessageCampaignSend?.blockers ?? null);

  const audiencePreview =
    previewData?.previewMessageCampaignSend?.audience ?? null;

  const publishedStatus = campaign?.status ?? '';
  const campaignStatus = isNonEmptyString(publishedStatus)
    ? publishedStatus
    : null;

  const notConfiguredDetail = !hasCampaignId
    ? 'No campaign was given to this screen.'
    : 'The native campaign engine is not enabled on this workspace.';

  const notConfigured = <TValue,>(): HermesCampaignLoad<TValue> => ({
    kind: 'not-configured',
    detail: notConfiguredDetail,
  });

  const capabilities: HermesCampaignCapabilities = useMemo(
    () => buildRuntimeCapabilities({ blockers, campaignStatus }),
    [blockers, campaignStatus],
  );

  const capabilitiesLoad: HermesCampaignLoad<HermesCampaignCapabilities> =
    !isEngineReachable
      ? notConfigured()
      : previewLoading && !isDefined(previewData)
        ? { kind: 'loading' }
        : isDefined(previewError)
          ? { kind: 'failed', ...readRuntimeFailure(previewError) }
          : { kind: 'ready', value: capabilities };

  const audienceLoad: HermesCampaignLoad<HermesCampaignAudience> =
    !isEngineReachable
      ? notConfigured()
      : previewLoading && !isDefined(previewData)
        ? { kind: 'loading' }
        : isDefined(previewError)
          ? { kind: 'failed', ...readRuntimeFailure(previewError) }
          : !isDefined(audiencePreview)
            ? // The server answered without an audience: it published no
              // figures, which is not an audience of nobody.
              { kind: 'empty' }
            : { kind: 'ready', value: buildRuntimeAudience(audiencePreview) };

  // The verdict the server reached on the address this campaign sends from.
  const campaignSenderVerdict: HermesSenderIdentityVerdict | null = useMemo(
    () =>
      !isDefined(blockers)
        ? null
        : blockers.length === 0
          ? { allowed: true, reasonCode: null, reason: null }
          : {
              allowed: false,
              reasonCode: blockers[0]?.code ?? null,
              reason: blockers[0]?.message ?? null,
            },
    [blockers],
  );

  const { identities, campaignIdentityId } = useMemo(
    () =>
      buildRuntimeSenderIdentities({
        channels: channelsData?.myMessageChannels ?? [],
        campaignFromAddress: campaign?.fromAddress?.primaryEmail ?? null,
        campaignSenderVerdict,
      }),
    [channelsData, campaign, campaignSenderVerdict],
  );

  const senderIdentitiesLoad: HermesCampaignLoad<HermesSenderIdentity[]> =
    !isMessageCampaignEnabled
      ? notConfigured()
      : channelsLoading && !isDefined(channelsData)
        ? { kind: 'loading' }
        : isDefined(channelsError)
          ? { kind: 'failed', ...readRuntimeFailure(channelsError) }
          : identities.length === 0
            ? { kind: 'empty' }
            : { kind: 'ready', value: identities };

  const resultsLoad: HermesCampaignLoad<HermesCampaignMetric[]> = !hasCampaignId
    ? notConfigured()
    : campaignLoading && !isDefined(campaign)
      ? { kind: 'loading' }
      : isDefined(campaignError)
        ? { kind: 'failed', ...readRuntimeFailure(campaignError) }
        : !isDefined(campaign)
          ? { kind: 'not-configured', detail: 'This campaign was not found.' }
          : { kind: 'ready', value: buildRuntimeMetrics(campaign) };

  const objections: HermesMarketingObjection[] = useMemo(
    () =>
      buildRuntimeMarketingObjections({
        entriesByEmail,
        topics: topicsData?.unsubscribeTopics ?? [],
      }),
    [entriesByEmail, topicsData],
  );

  const objectionsLoad: HermesCampaignLoad<HermesMarketingObjection[]> =
    !isMessageCampaignEnabled
      ? notConfigured()
      : registerCoverage === 'unavailable'
        ? registerLoading
          ? { kind: 'loading' }
          : {
              kind: 'failed',
              reasonCode: 'SUPPRESSION_REGISTER_UNAVAILABLE',
              reason: null,
            }
        : objections.length === 0
          ? { kind: 'empty' }
          : { kind: 'ready', value: objections };

  const publishedContent: HermesCampaignContent = {
    subject: campaign?.subject ?? '',
    body: campaign?.bodyTemplate ?? '',
  };

  const recordedSchedule = readRuntimeSchedule(campaign?.scheduledAt);

  const refreshReadOnlyViews = useCallback(async () => {
    // Both are reads. Neither emits anything.
    await Promise.all([
      refetchCampaign().catch(() => undefined),
      isEngineReachable ? refetchPreview().catch(() => undefined) : undefined,
    ]);
  }, [refetchCampaign, refetchPreview, isEngineReachable]);

  const onSchedule = useCallback(
    async (schedule: HermesCampaignSchedule) => {
      const scheduledAt = buildRuntimeScheduleInstant(schedule);

      if (!isDefined(scheduledAt)) {
        setActionOutcome({
          kind: 'failed',
          action: 'schedule',
          reasonCode: 'SCHEDULE_MOMENT_NOT_RESOLVED',
          reason: null,
        });

        return;
      }

      setActionOutcome({ kind: 'running', action: 'schedule' });

      try {
        // Records the moment. The engine queues a delayed job and reads the
        // sender, the capability and the exclusions again at departure, which
        // is why nothing leaves at the moment of this call.
        const { data } = await scheduleCampaign({
          variables: { input: { campaignId, scheduledAt } },
        });

        if (!isDefined(data?.sendMessageCampaign)) {
          // An answer this screen could not read is not a success.
          setActionOutcome({
            kind: 'failed',
            action: 'schedule',
            reasonCode: 'SERVER_ANSWER_UNREADABLE',
            reason: null,
          });

          return;
        }

        setActionOutcome({
          kind: 'succeeded',
          action: 'schedule',
          detail: null,
        });
        setScheduleDraftOverride(null);
        await refreshReadOnlyViews();
      } catch (error) {
        setActionOutcome({
          kind: 'failed',
          action: 'schedule',
          ...readRuntimeFailure(error),
        });
      }
    },
    [campaignId, scheduleCampaign, refreshReadOnlyViews],
  );

  const onCancelSchedule = useCallback(async () => {
    setActionOutcome({ kind: 'running', action: 'cancelSchedule' });

    try {
      const { data } = await cancelCampaign({
        variables: { input: { campaignId } },
      });

      if (!isDefined(data?.cancelMessageCampaign)) {
        setActionOutcome({
          kind: 'failed',
          action: 'cancelSchedule',
          reasonCode: 'SERVER_ANSWER_UNREADABLE',
          reason: null,
        });

        return;
      }

      setActionOutcome({
        kind: 'succeeded',
        action: 'cancelSchedule',
        detail: null,
      });
      await refreshReadOnlyViews();
    } catch (error) {
      setActionOutcome({
        kind: 'failed',
        action: 'cancelSchedule',
        ...readRuntimeFailure(error),
      });
    }
  }, [campaignId, cancelCampaign, refreshReadOnlyViews]);

  return {
    campaignName: campaign?.name ?? null,
    // A status outside the five of the contract, and a campaign still being
    // read, both show as a draft: the state that claims nothing has been sent
    // and permits nothing on its own.
    campaignState: readRuntimeCampaignState(campaignStatus) ?? 'draft',

    senderIdentitiesLoad,
    selectedIdentityId: selectedIdentityOverride ?? campaignIdentityId,
    onSelectIdentity: setSelectedIdentityOverride,
    onRetrySenderIdentities: () => {
      void refetchChannels();
    },

    capabilitiesLoad,
    onRetryCapabilities: () => {
      void refetchPreview();
    },

    audienceLoad,
    onRetryAudience: () => {
      void refetchPreview();
    },

    content: contentDraft ?? publishedContent,
    onContentChange: setContentDraft,
    // No operation renders a campaign's content for a recipient, so nothing
    // was rendered and the screen says so rather than showing the template
    // back as if it were a rendering.
    previewState: { kind: 'idle' as const },

    scheduleDraft: scheduleDraftOverride ?? recordedSchedule ?? EMPTY_SCHEDULE,
    onScheduleDraftChange: setScheduleDraftOverride,
    timeZones: SUPPORTED_TIME_ZONES,
    scheduledAt: recordedSchedule,

    actionOutcome,
    onSchedule,
    onCancelSchedule,

    resultsLoad,
    onRetryResults: () => {
      void refetchCampaign();
    },

    objectionsLoad,
  };
};
