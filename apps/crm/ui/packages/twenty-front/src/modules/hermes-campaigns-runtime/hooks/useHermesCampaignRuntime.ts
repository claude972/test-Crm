import { useMutation, useQuery } from '@apollo/client/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';

import { CANCEL_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/cancelMessageCampaign';
import { SEND_MESSAGE_CAMPAIGN } from '@/activities/emails/graphql/mutations/sendMessageCampaign';
import { SEND_MESSAGE_CAMPAIGN_TEST } from '@/activities/emails/graphql/mutations/sendMessageCampaignTest';
import { PREVIEW_MESSAGE_CAMPAIGN_SEND } from '@/activities/emails/graphql/metadata-queries/previewMessageCampaignSend';
import { UNSUBSCRIBE_TOPICS } from '@/activities/emails/graphql/metadata-queries/unsubscribeTopics';
import { type HermesCampaignAudience } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import { type HermesCampaignCapabilities } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import {
  type HermesCampaignContent,
  type HermesCampaignPreviewState,
} from '@/hermes-campaigns-ui/types/HermesCampaignContent';
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
import { validateTestDestination } from '@/hermes-campaigns-ui/utils/validateTestDestination';
import { PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT } from '@/hermes-campaigns-runtime/graphql/queries/previewMessageCampaignRecipient';
import { useHermesCampaignPersistence } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignPersistence';
import { useHermesRuntimeCampaignAudiences } from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignAudiences';
import { useHermesRuntimeCampaignRecipients } from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignRecipients';
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
import { readRuntimeRecipientPreview } from '@/hermes-campaigns-runtime/utils/readRuntimeRecipientPreview';
import { readHermesCallFailure } from '@/prospection/utils/readHermesCallFailure';
import { useHermesMailboxRuntimeIdentity } from '@/hermes-mailbox-runtime/hooks/useHermesMailboxRuntimeIdentity';
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

// The actions that put a message on a transport. After one of these ends in
// an unknown state, no emitting control is offered again until the campaign
// has been re-read: that is the whole no-blind-retry rule, in one list.
const EMITTING_ACTIONS: readonly string[] = ['send', 'testSynthetic'];

type PreviewQueryResult = {
  previewMessageCampaignSend?: {
    audience?: HermesRuntimeAudiencePreview | null;
    blockers?: HermesRuntimeSendBlocker[] | null;
  } | null;
};

type RecipientPreviewQueryResult = {
  previewMessageCampaignRecipient?: unknown;
};

type RecipientPreviewQueryVariables = {
  input: { campaignId: string; personId?: string };
};

// The three mutation answers, typed from their own selection sets. Only the
// presence of the payload is read — an answer this screen cannot read is
// reported as unreadable rather than as a success — but the shape is written
// out so a change in the document cannot pass silently.
type SendMutationResult = {
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

// `scheduledAt` omitted is an immediate departure; present records a moment.
// One operation, two meanings, and the screen never confuses them.
type SendMutationVariables = {
  input: { campaignId: string; scheduledAt?: string };
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

type TestMutationResult = {
  sendMessageCampaignTest: { messageId: string } | null;
};

type TestMutationVariables = {
  input: {
    toAddress: string;
    subject: string;
    body: string;
    fromAddress: string;
    unsubscribeTopicId?: string;
  };
};

type ChannelsQueryResult = {
  myMessageChannels?: HermesRuntimeMessageChannel[] | null;
};

type TopicsQueryResult = {
  unsubscribeTopics?: { id: string; name?: string | null }[] | null;
};

// Whether the stored body carries any text at all.
//
// `bodyTemplate` holds a serialised email document, not prose, so its string
// length says nothing: an empty document is still a long JSON string. This
// looks for any text node with content, and treats an unparseable value as
// prose so a legacy plain-text body is still read correctly.
//
// SEAM: once `readCampaignBodyText` from
// `hermes-campaigns-ui/utils/campaignBodyDocument` is on this branch, this
// helper should be replaced by it so there is one reader rather than two.
// It is written to err toward "empty", which refuses a test rather than
// sending a message with nothing in it.
const hasBodyText = (bodyTemplate: string): boolean => {
  const trimmed = bodyTemplate.trim();

  if (trimmed.length === 0) {
    return false;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(trimmed);
  } catch {
    // Not a document: read it as the prose it appears to be.
    return true;
  }

  const carriesText = (node: unknown): boolean => {
    if (Array.isArray(node)) {
      return node.some(carriesText);
    }

    if (typeof node !== 'object' || node === null) {
      return false;
    }

    const record = node as Record<string, unknown>;

    if (typeof record.text === 'string' && record.text.trim().length > 0) {
      return true;
    }

    return carriesText(record.content);
  };

  return carriesText(parsed);
};

// An emission that threw. A refusal the server reasoned about is a refusal;
// anything else leaves the outcome unknown, and an unknown emission is never
// reported as a failure, because "failed" reads as an invitation to press
// again while a message may already be in flight.
const readEmissionFailure = (
  action: 'send' | 'testSynthetic',
  error: unknown,
): HermesCampaignActionOutcome => {
  const failure = readHermesCallFailure(error);
  const reason = isNonEmptyString(failure.message) ? failure.message : null;
  const reasonCode =
    failure.kind === 'none' ? null : failure.kind.toUpperCase();

  return failure.kind === 'denied' ||
    failure.kind === 'rejected-input' ||
    failure.kind === 'conflict'
    ? { kind: 'failed', action, reasonCode, reason }
    : { kind: 'unconfirmed', action, reasonCode, reason };
};

// Everything the campaign screen needs, read from and written to the emailing
// engine the workspace already runs.
//
// Every action the screen offers is wired here. Where a step is unavailable
// it is the server's published verdict that shuts it, not a missing callback:
// an absent sender or an unverified domain closes sending with its reason,
// and that is correct — but the callback exists, so the guard is what
// refuses rather than the wiring.
//
// Three things this hook is careful about:
//
// - The subject, the message and the chosen sender are recorded on the
//   campaign record, so they survive a reload. They used to live in component
//   state, which looked like saving and survived nothing.
// - An immediate send happens only on an explicit press, after an explicit
//   confirmation in the page, and never on mount.
// - An uncertain outcome is never retried. It shuts the emitting steps and
//   asks for the campaign to be re-read, which is what the engine's own
//   quarantine does server side.
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

  const { data: topicsData } = useQuery<TopicsQueryResult>(UNSUBSCRIBE_TOPICS, {
    skip: !isMessageCampaignEnabled,
  });

  const {
    entriesByEmail,
    coverage: registerCoverage,
    loading: registerLoading,
  } = useProspectionSuppressionRegister();

  // Which mailbox is actually registered, resolved from the central MAIL
  // connection and then from the native account it names. This is the only
  // delegation fact available: the send preview never looks at the mailbox,
  // so it cannot stand in for this.
  const { identity: mailboxIdentity } = useHermesMailboxRuntimeIdentity();

  const centralMailboxAddress =
    mailboxIdentity.kind === 'known' ? mailboxIdentity.mailboxAddress : null;

  const [sendCampaign] = useMutation<SendMutationResult, SendMutationVariables>(
    SEND_MESSAGE_CAMPAIGN,
    // The transport never replays an emission on its own: a retry nobody
    // asked for is how an uncertain outcome becomes a duplicate.
    { context: { skipRetry: true } },
  );
  const [cancelCampaign] = useMutation<
    CancelMutationResult,
    CancelMutationVariables
  >(CANCEL_MESSAGE_CAMPAIGN, { context: { skipRetry: true } });
  const [sendTest] = useMutation<TestMutationResult, TestMutationVariables>(
    SEND_MESSAGE_CAMPAIGN_TEST,
    { context: { skipRetry: true } },
  );

  // The recipient preview is a query, but it is run on demand rather than on
  // mount, so it is driven imperatively. It emits nothing.
  const [runPreview] = useMutation<
    RecipientPreviewQueryResult,
    RecipientPreviewQueryVariables
  >(PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT);

  const [contentDraft, setContentDraft] =
    useState<HermesCampaignContent | null>(null);
  const [scheduleDraftOverride, setScheduleDraftOverride] =
    useState<HermesCampaignSchedule | null>(null);
  const [selectedIdentityOverride, setSelectedIdentityOverride] = useState<
    string | null
  >(null);
  const [actionOutcome, setActionOutcome] =
    useState<HermesCampaignActionOutcome | null>(null);
  const [testDestination, setTestDestination] = useState('');
  const [selectedPreviewRecipientId, setSelectedPreviewRecipientId] = useState<
    string | null
  >(null);
  const [previewState, setPreviewState] = useState<HermesCampaignPreviewState>({
    kind: 'idle',
  });

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

  const { identities, campaignIdentityId, centralIdentityId } = useMemo(
    () =>
      buildRuntimeSenderIdentities({
        channels: channelsData?.myMessageChannels ?? [],
        campaignFromAddress: campaign?.fromAddress?.primaryEmail ?? null,
        campaignSenderVerdict,
        centralMailboxAddress,
      }),
    [channelsData, campaign, campaignSenderVerdict, centralMailboxAddress],
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

  const publishedSubject = campaign?.subject ?? '';
  const publishedBody = campaign?.bodyTemplate ?? '';

  const publishedContent: HermesCampaignContent = {
    subject: publishedSubject,
    body: publishedBody,
  };

  const recordedSchedule = readRuntimeSchedule(campaign?.scheduledAt);

  const refreshReadOnlyViews = useCallback(async () => {
    // Both are reads. Neither emits anything.
    await Promise.all([
      refetchCampaign().catch(() => undefined),
      isEngineReachable ? refetchPreview().catch(() => undefined) : undefined,
    ]);
  }, [refetchCampaign, refetchPreview, isEngineReachable]);

  const { audiencesLoad, onRetryAudiences } =
    useHermesRuntimeCampaignAudiences({
      isEngineEnabled: isMessageCampaignEnabled,
    });

  const { recipients: previewRecipients } = useHermesRuntimeCampaignRecipients({
    listId: isNonEmptyString(campaign?.listId) ? campaign.listId : null,
  });

  const {
    contentSaveState,
    senderSaveState,
    listSaveState,
    topicSaveState,
    saveContent,
    saveSender,
    saveList,
    saveUnsubscribeTopic,
    markContentUnsaved,
  } = useHermesCampaignPersistence({
    campaignId,
    onRecorded: refreshReadOnlyViews,
  });

  const content = contentDraft ?? publishedContent;

  // What is on screen differs from what the server holds. Compared against
  // the record rather than tracked by a flag, so a draft edited back to its
  // stored value correctly stops counting as unsaved.
  const hasUnsavedContent =
    content.subject !== publishedSubject || content.body !== publishedBody;

  // The draft, readable synchronously after an await. A recording takes a
  // round trip, and the operator may well keep typing during it, so the state
  // value captured when the save started cannot be trusted afterwards.
  const contentDraftRef = useRef<HermesCampaignContent | null>(null);

  const onContentChange = useCallback(
    (next: HermesCampaignContent) => {
      contentDraftRef.current = next;
      setContentDraft(next);
      markContentUnsaved();
    },
    [markContentUnsaved],
  );

  const onSaveContent = useCallback(async () => {
    // Exactly what is being sent, frozen before the call.
    //
    // `attempted.body` is persisted as it stands. It is a serialised email
    // document produced by the native editor, so it must never be passed
    // through a validator's normalised copy or any text projection on the way
    // out: that would write flattened prose back into `bodyTemplate` and
    // break the engine's own parse.
    const attempted = content;

    const recorded = await saveContent(attempted);

    if (!recorded) {
      return;
    }

    const live = contentDraftRef.current;
    const typedDuringTheSave =
      isDefined(live) &&
      (live.subject !== attempted.subject || live.body !== attempted.body);

    if (typedDuringTheSave) {
      // Keeping the draft is the whole point: dropping it here would throw
      // away everything typed while the mutation was in flight. What was
      // recorded is the snapshot that was sent, not what is on screen now,
      // so the screen goes back to saying the content is not recorded.
      markContentUnsaved();

      return;
    }

    // Nothing moved under the save: the server's answer is now the source,
    // so the local draft is dropped and the screen shows what was stored.
    contentDraftRef.current = null;
    setContentDraft(null);
  }, [saveContent, content, markContentUnsaved]);

  // Choosing a sender records it. The server still decides at departure
  // whether that address may carry this campaign, and can refuse then.
  const onSelectIdentity = useCallback(
    (identityId: string) => {
      setSelectedIdentityOverride(identityId);

      const identity = identities.find(
        (candidate) => candidate.id === identityId,
      );
      const address = identity?.displayedAddress;

      if (!isNonEmptyString(address)) {
        setActionOutcome({
          kind: 'failed',
          action: 'saveSender',
          reasonCode: 'SENDER_ADDRESS_NOT_PUBLISHED',
          reason: null,
        });

        return;
      }

      void saveSender(address);
    },
    [identities, saveSender],
  );

  const onSelectList = useCallback(
    (listId: string) => {
      void saveList(listId);
    },
    [saveList],
  );

  const onSelectTopic = useCallback(
    (topicId: string) => {
      void saveUnsubscribeTopic(topicId);
    },
    [saveUnsubscribeTopic],
  );

  // What the sender radio shows. A campaign that has recorded no sender
  // offers the mailbox that is genuinely registered, so the choice is in
  // front of the operator instead of being somewhere else — but offering is
  // not recording: nothing is written until the choice is made, and the
  // section says so.
  const offeredIdentityId =
    selectedIdentityOverride ?? campaignIdentityId ?? centralIdentityId;

  const isSenderRecorded = isNonEmptyString(campaignIdentityId);

  // Records whatever the sender control currently shows.
  //
  // A proposal is pre-selected when the campaign holds no sender, and a radio
  // that is already selected fires no change — so relying on the radio alone
  // would leave the proposal permanently unrecordable, which is the same dead
  // end one step further on. This gives the act its own control.
  const onRecordSender = useCallback(() => {
    const identity = identities.find(
      (candidate) => candidate.id === offeredIdentityId,
    );
    const address = identity?.displayedAddress;

    if (!isNonEmptyString(address)) {
      setActionOutcome({
        kind: 'failed',
        action: 'saveSender',
        reasonCode: 'SENDER_ADDRESS_NOT_PUBLISHED',
        reason: null,
      });

      return;
    }

    void saveSender(address);
  }, [identities, offeredIdentityId, saveSender]);

  const selectedIdentity = useMemo(() => {
    const identityId = selectedIdentityOverride ?? campaignIdentityId;

    return isNonEmptyString(identityId)
      ? (identities.find((candidate) => candidate.id === identityId) ?? null)
      : null;
  }, [identities, selectedIdentityOverride, campaignIdentityId]);

  // ---- Preview: renders content for one recipient and emits nothing. ----

  const onPreview = useCallback(async () => {
    setPreviewState({ kind: 'loading' });
    setActionOutcome({ kind: 'running', action: 'preview' });

    try {
      const { data } = await runPreview({
        variables: {
          input: {
            campaignId,
            // Omitted renders the first sendable recipient in the engine's
            // own order. Given, it renders that person even when excluded,
            // and the exclusion is then shown rather than the row hidden.
            ...(isNonEmptyString(selectedPreviewRecipientId)
              ? { personId: selectedPreviewRecipientId }
              : {}),
          },
        },
      });

      const read = readRuntimeRecipientPreview(
        data?.previewMessageCampaignRecipient,
      );

      if (read.kind !== 'read') {
        setPreviewState({
          kind: 'failed',
          reasonCode: 'SERVER_ANSWER_UNREADABLE',
          reason: null,
        });
        setActionOutcome({
          kind: 'failed',
          action: 'preview',
          reasonCode: 'SERVER_ANSWER_UNREADABLE',
          reason: null,
        });

        return;
      }

      setPreviewState({ kind: 'ready', preview: read.value });
      setActionOutcome({ kind: 'succeeded', action: 'preview', detail: null });
    } catch (error) {
      // A failed render is a failed render, never an empty preview, and it
      // emitted nothing either way.
      const failure = readRuntimeFailure(error);

      setPreviewState({ kind: 'failed', ...failure });
      setActionOutcome({ kind: 'failed', action: 'preview', ...failure });
    }
  }, [campaignId, runPreview, selectedPreviewRecipientId]);

  // ---- Test: one real message, to the address somebody typed. ----

  const onSendSyntheticTest = useCallback(async () => {
    const destination = validateTestDestination(testDestination);

    if (!destination.usable) {
      setActionOutcome({
        kind: 'failed',
        action: 'testSynthetic',
        reasonCode: destination.code.toUpperCase().replaceAll('-', '_'),
        reason: null,
      });

      return;
    }

    const fromAddress = selectedIdentity?.displayedAddress;

    if (!isNonEmptyString(fromAddress)) {
      setActionOutcome({
        kind: 'failed',
        action: 'testSynthetic',
        reasonCode: 'SENDER_ADDRESS_NOT_PUBLISHED',
        reason: null,
      });

      return;
    }

    // The stored content, not the draft on screen: a test that rehearsed
    // unrecorded text would not rehearse what this campaign will send.
    //
    // The body is checked for actual text rather than for string length: it
    // holds a serialised document, so an empty one is still a long string.
    if (!isNonEmptyString(publishedSubject) || !hasBodyText(publishedBody)) {
      setActionOutcome({
        kind: 'failed',
        action: 'testSynthetic',
        reasonCode: 'CAMPAIGN_CONTENT_NOT_RECORDED',
        reason: null,
      });

      return;
    }

    setActionOutcome({ kind: 'running', action: 'testSynthetic' });

    try {
      const { data } = await sendTest({
        variables: {
          input: {
            toAddress: destination.address,
            subject: publishedSubject,
            body: publishedBody,
            fromAddress,
            ...(isNonEmptyString(campaign?.unsubscribeTopicId)
              ? { unsubscribeTopicId: campaign.unsubscribeTopicId }
              : {}),
          },
        },
      });

      if (!isDefined(data?.sendMessageCampaignTest)) {
        // A message may already have left. Neither a success nor a refusal.
        setActionOutcome({
          kind: 'unconfirmed',
          action: 'testSynthetic',
          reasonCode: 'SERVER_ANSWER_UNREADABLE',
          reason: null,
        });

        return;
      }

      setActionOutcome({
        kind: 'succeeded',
        action: 'testSynthetic',
        detail: null,
      });
    } catch (error) {
      setActionOutcome(readEmissionFailure('testSynthetic', error));
    }
  }, [
    testDestination,
    selectedIdentity,
    publishedSubject,
    publishedBody,
    campaign,
    sendTest,
  ]);

  // ---- Schedule, cancel, immediate send. ----

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
        const { data } = await sendCampaign({
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
    [campaignId, sendCampaign, refreshReadOnlyViews],
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

  // An immediate departure: the same operation as a schedule, with no moment.
  //
  // Reached only from an explicit press on a control the page confirms
  // separately, and only while the server publishes the capability and the
  // chosen identity is authorised. Never called on mount, never on a timer,
  // never as a fallback from a failed schedule.
  const onSend = useCallback(async () => {
    setActionOutcome({ kind: 'running', action: 'send' });

    try {
      const { data } = await sendCampaign({
        variables: { input: { campaignId } },
      });

      if (!isDefined(data?.sendMessageCampaign)) {
        // The engine may have claimed the campaign already. Calling this a
        // failure would invite a second press.
        setActionOutcome({
          kind: 'unconfirmed',
          action: 'send',
          reasonCode: 'SERVER_ANSWER_UNREADABLE',
          reason: null,
        });
        await refreshReadOnlyViews();

        return;
      }

      setActionOutcome({ kind: 'succeeded', action: 'send', detail: null });
      await refreshReadOnlyViews();
    } catch (error) {
      setActionOutcome(readEmissionFailure('send', error));
      await refreshReadOnlyViews();
    }
  }, [campaignId, sendCampaign, refreshReadOnlyViews]);

  // Shuts the emitting steps after an emission whose result is unknown. The
  // campaign has to be re-read before anyone decides anything: this is the
  // interface half of the engine's own quarantine.
  const hasUncertainEmission =
    actionOutcome?.kind === 'unconfirmed' &&
    EMITTING_ACTIONS.includes(actionOutcome.action);

  return {
    campaignName: campaign?.name ?? null,
    // A status outside the five of the contract, and a campaign still being
    // read, both show as a draft: the state that claims nothing has been sent
    // and permits nothing on its own.
    campaignState: readRuntimeCampaignState(campaignStatus) ?? 'draft',

    senderIdentitiesLoad,
    selectedIdentityId: offeredIdentityId,
    onSelectIdentity,
    senderSaveState,
    isSenderRecorded,
    onRecordSender,
    // Unproven on purpose: nothing read here establishes that the transport
    // works. Only a probe or an actual send does.
    isTransportProven: false,
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

    audiencesLoad,
    onRetryAudiences,
    selectedListId: isNonEmptyString(campaign?.listId) ? campaign.listId : null,
    onSelectList,
    listSaveState,
    unsubscribeTopics: (topicsData?.unsubscribeTopics ?? []).map((topic) => ({
      id: topic.id,
      name: topic.name ?? null,
      description: null,
    })),
    selectedTopicId: isNonEmptyString(campaign?.unsubscribeTopicId)
      ? campaign.unsubscribeTopicId
      : null,
    onSelectTopic,
    topicSaveState,

    content,
    onContentChange,
    contentSaveState,
    onSaveContent,
    hasUnsavedContent,

    previewState,
    previewRecipients,
    selectedPreviewRecipientId,
    onSelectPreviewRecipient: setSelectedPreviewRecipientId,
    onPreview,

    testDestination,
    onTestDestinationChange: setTestDestination,

    scheduleDraft: scheduleDraftOverride ?? recordedSchedule ?? EMPTY_SCHEDULE,
    onScheduleDraftChange: setScheduleDraftOverride,
    timeZones: SUPPORTED_TIME_ZONES,
    scheduledAt: recordedSchedule,

    actionOutcome,
    hasUncertainEmission,
    onSchedule,
    onCancelSchedule,
    onSend,
    onSendSyntheticTest,

    resultsLoad,
    onRetryResults: () => {
      void refetchCampaign();
    },

    objectionsLoad,
  };
};
