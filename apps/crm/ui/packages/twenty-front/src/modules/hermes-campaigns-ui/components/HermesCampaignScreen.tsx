import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'kovaa-lab-shared/utils';
import {
  IconCheck,
  IconCircleOff,
  IconClock,
  IconFileText,
  IconSend,
  type IconComponent,
} from 'kovaa-lab-ui/icon';
import {
  Tag,
  type TagColor,
  type TagProps,
} from 'kovaa-lab-ui/primitives/data-display';
import { MOBILE_VIEWPORT, themeCssVariables } from 'kovaa-lab-ui/theme';

import { HermesCampaignAudienceSection } from '@/hermes-campaigns-ui/components/HermesCampaignAudienceSection';
import { HermesCampaignCapabilitiesSection } from '@/hermes-campaigns-ui/components/HermesCampaignCapabilitiesSection';
import { HermesCampaignContentSection } from '@/hermes-campaigns-ui/components/HermesCampaignContentSection';
import { HermesCampaignJourneySection } from '@/hermes-campaigns-ui/components/HermesCampaignJourneySection';
import { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
import { HermesCampaignResultsSection } from '@/hermes-campaigns-ui/components/HermesCampaignResultsSection';
import { HermesMarketingObjectionSection } from '@/hermes-campaigns-ui/components/HermesMarketingObjectionSection';
import { HermesSenderIdentitySection } from '@/hermes-campaigns-ui/components/HermesSenderIdentitySection';
import { type HermesCampaignAudience } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
import { type HermesCampaignCapabilities } from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
import {
  type HermesCampaignContent,
  type HermesCampaignPreviewState,
} from '@/hermes-campaigns-ui/types/HermesCampaignContent';
import {
  type HermesCampaignActionOutcome,
  type HermesCampaignSchedule,
  type HermesCampaignState,
} from '@/hermes-campaigns-ui/types/HermesCampaignJourney';
import { type HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
import { type HermesCampaignPreviewRecipient } from '@/hermes-campaigns-ui/types/HermesCampaignPreviewRecipient';
import { type HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';
import { type HermesCampaignMetric } from '@/hermes-campaigns-ui/types/HermesCampaignResult';
import { type HermesMarketingObjection } from '@/hermes-campaigns-ui/types/HermesMarketingObjection';
import { type HermesSenderIdentity } from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
import { readSenderIdentityAuthorization } from '@/hermes-campaigns-ui/utils/readSenderIdentityAuthorization';

// One icon and one word per state, so none of the five reads like another
// without colour.
const STATE_PRESENTATION: Record<
  HermesCampaignState,
  {
    color: TagColor;
    variant: NonNullable<TagProps['variant']>;
    Icon: IconComponent;
  }
> = {
  draft: { color: 'gray', variant: 'outline', Icon: IconFileText },
  scheduled: { color: 'blue', variant: 'soft', Icon: IconClock },
  sending: { color: 'amber', variant: 'soft', Icon: IconSend },
  sent: { color: 'jade', variant: 'soft', Icon: IconCheck },
  cancelled: { color: 'gray', variant: 'soft', Icon: IconCircleOff },
};

const StyledScreen = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[6]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[4]};

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    gap: ${themeCssVariables.spacing[5]};
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};
  }
`;

const StyledHeader = styled.header`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledTitleRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export type HermesCampaignScreenProps = {
  campaignName: string | null;
  campaignState: HermesCampaignState;

  senderIdentitiesLoad: HermesCampaignLoad<HermesSenderIdentity[]>;
  selectedIdentityId: string | null;
  onSelectIdentity: (identityId: string) => void;
  onRetrySenderIdentities?: () => void;

  capabilitiesLoad: HermesCampaignLoad<HermesCampaignCapabilities>;
  onRetryCapabilities?: () => void;

  audienceLoad: HermesCampaignLoad<HermesCampaignAudience>;
  onRetryAudience?: () => void;

  content: HermesCampaignContent;
  onContentChange: (content: HermesCampaignContent) => void;
  // How the last recording of the subject and the message went, and the
  // control that performs it. Without these the content would be editable
  // and never stored, which is the defect this screen used to have.
  contentSaveState: HermesCampaignSaveState;
  onSaveContent?: () => void;
  // How recording the chosen sender went.
  senderSaveState: HermesCampaignSaveState;

  previewState: HermesCampaignPreviewState;
  previewRecipients: HermesCampaignPreviewRecipient[];
  selectedPreviewRecipientId: string | null;
  onSelectPreviewRecipient?: (recipientId: string) => void;

  // Where a test message really goes. Typed by the operator, no default.
  testDestination: string;
  onTestDestinationChange: (destination: string) => void;

  scheduleDraft: HermesCampaignSchedule;
  onScheduleDraftChange: (draft: HermesCampaignSchedule) => void;
  timeZones: string[];
  scheduledAt: HermesCampaignSchedule | null;

  actionOutcome: HermesCampaignActionOutcome | null;
  // True once an emission ended with no known result. The emitting steps stay
  // shut until the campaign is re-read: no blind retry.
  hasUncertainEmission: boolean;
  onPreview?: () => void;
  onSendSyntheticTest?: () => void;
  onSchedule?: (schedule: HermesCampaignSchedule) => void;
  onCancelSchedule?: () => void;
  onSend?: () => void;

  resultsLoad: HermesCampaignLoad<HermesCampaignMetric[]>;
  onRetryResults?: () => void;

  objectionsLoad: HermesCampaignLoad<HermesMarketingObjection[]>;
  onRetryObjections?: () => void;
};

// The whole campaign screen, driven entirely by its props.
//
// It calls no API and holds no transport. Every verdict it shows was computed
// by the server and handed to it; every action it offers is a callback the
// caller wired. Nothing here emits anything.
export const HermesCampaignScreen = ({
  campaignName,
  campaignState,
  senderIdentitiesLoad,
  selectedIdentityId,
  onSelectIdentity,
  onRetrySenderIdentities,
  capabilitiesLoad,
  onRetryCapabilities,
  audienceLoad,
  onRetryAudience,
  content,
  onContentChange,
  contentSaveState,
  onSaveContent,
  senderSaveState,
  previewState,
  previewRecipients,
  selectedPreviewRecipientId,
  onSelectPreviewRecipient,
  testDestination,
  onTestDestinationChange,
  scheduleDraft,
  onScheduleDraftChange,
  timeZones,
  scheduledAt,
  actionOutcome,
  hasUncertainEmission,
  onPreview,
  onSendSyntheticTest,
  onSchedule,
  onCancelSchedule,
  onSend,
  resultsLoad,
  onRetryResults,
  objectionsLoad,
  onRetryObjections,
}: HermesCampaignScreenProps) => {
  const { t } = useLingui();

  const stateLabels: Record<HermesCampaignState, string> = {
    draft: t`Draft`,
    scheduled: t`Scheduled`,
    sending: t`Sending`,
    sent: t`Sent`,
    cancelled: t`Cancelled`,
  };

  const {
    color: stateColor,
    variant: stateVariant,
    Icon: StateIcon,
  } = STATE_PRESENTATION[campaignState];

  // The verdict on the chosen identity, computed once and shared, so the
  // capabilities and the journey cannot disagree about it.
  const identityAuthorization = useMemo(() => {
    if (senderIdentitiesLoad.kind !== 'ready' || !isDefined(selectedIdentityId)) {
      return null;
    }

    const identity = senderIdentitiesLoad.value.find(
      (candidate) => candidate.id === selectedIdentityId,
    );

    return isDefined(identity)
      ? readSenderIdentityAuthorization(identity)
      : null;
  }, [senderIdentitiesLoad, selectedIdentityId]);

  const capabilities =
    capabilitiesLoad.kind === 'ready' ? capabilitiesLoad.value : null;

  const audience = audienceLoad.kind === 'ready' ? audienceLoad.value : null;

  return (
    <StyledScreen>
      <StyledHeader>
        <StyledTitleRow>
          <StyledTitle>
            {isNonEmptyString(campaignName?.trim())
              ? campaignName
              : t`Untitled campaign`}
          </StyledTitle>
          <Tag
            color={stateColor}
            variant={stateVariant}
            borderStyle="solid"
            startIcon={<StateIcon />}
            truncate={false}
          >
            {stateLabels[campaignState]}
          </Tag>
        </StyledTitleRow>
        <HermesCampaignNote>
          <Trans>
            B2B campaign. Nothing on this screen sends by itself: each step is
            permitted by the server or it is shut, and the reason is shown.
          </Trans>
        </HermesCampaignNote>
      </StyledHeader>

      <HermesSenderIdentitySection
        load={senderIdentitiesLoad}
        selectedIdentityId={selectedIdentityId}
        onSelectIdentity={onSelectIdentity}
        onRetry={onRetrySenderIdentities}
        saveState={senderSaveState}
      />

      <HermesCampaignCapabilitiesSection
        load={capabilitiesLoad}
        identityAuthorization={identityAuthorization}
        onRetry={onRetryCapabilities}
      />

      <HermesCampaignAudienceSection
        load={audienceLoad}
        onRetry={onRetryAudience}
      />

      <HermesCampaignContentSection
        content={content}
        onContentChange={onContentChange}
        declaredVariables={audience?.variables ?? []}
        previewState={previewState}
        isEditable={campaignState === 'draft'}
        saveState={contentSaveState}
        onSaveContent={onSaveContent}
      />

      <HermesCampaignJourneySection
        capabilities={capabilities}
        identityAuthorization={identityAuthorization}
        campaignState={campaignState}
        scheduleDraft={scheduleDraft}
        onScheduleDraftChange={onScheduleDraftChange}
        timeZones={timeZones}
        scheduledAt={scheduledAt}
        retainedCount={audience?.retainedCount ?? null}
        outcome={actionOutcome}
        hasUncertainEmission={hasUncertainEmission}
        previewRecipients={previewRecipients}
        selectedPreviewRecipientId={selectedPreviewRecipientId}
        onSelectPreviewRecipient={onSelectPreviewRecipient}
        testDestination={testDestination}
        onTestDestinationChange={onTestDestinationChange}
        onPreview={onPreview}
        onSendSyntheticTest={onSendSyntheticTest}
        onSchedule={onSchedule}
        onCancelSchedule={onCancelSchedule}
        onSend={onSend}
      />

      <HermesCampaignResultsSection
        load={resultsLoad}
        onRetry={onRetryResults}
      />

      <HermesMarketingObjectionSection
        load={objectionsLoad}
        onRetry={onRetryObjections}
      />
    </StyledScreen>
  );
};
