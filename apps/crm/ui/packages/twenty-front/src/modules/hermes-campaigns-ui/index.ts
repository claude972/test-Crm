// Public surface of the campaign screen.
//
// Everything here is driven by props. No component in this module calls an
// API, holds a transport or emits anything: the native emailing engine is the
// one that will send, and the parent wires it in.

export { HermesCampaignActionButton } from '@/hermes-campaigns-ui/components/HermesCampaignActionButton';
export { HermesCampaignAudienceSection } from '@/hermes-campaigns-ui/components/HermesCampaignAudienceSection';
export { HermesCampaignCapabilitiesSection } from '@/hermes-campaigns-ui/components/HermesCampaignCapabilitiesSection';
export { HermesCampaignContentSection } from '@/hermes-campaigns-ui/components/HermesCampaignContentSection';
export { HermesCampaignCountValue } from '@/hermes-campaigns-ui/components/HermesCampaignCountValue';
export { HermesCampaignIssueList } from '@/hermes-campaigns-ui/components/HermesCampaignIssueList';
export { HermesCampaignJourneySection } from '@/hermes-campaigns-ui/components/HermesCampaignJourneySection';
export { HermesCampaignListView } from '@/hermes-campaigns-ui/components/HermesCampaignListView';
export type { HermesCampaignListViewProps } from '@/hermes-campaigns-ui/components/HermesCampaignListView';
export { HermesCampaignLoadView } from '@/hermes-campaigns-ui/components/HermesCampaignLoadView';
export { HermesCampaignMetricValue } from '@/hermes-campaigns-ui/components/HermesCampaignMetricValue';
export { HermesCampaignNote } from '@/hermes-campaigns-ui/components/HermesCampaignNote';
export { HermesCampaignReason } from '@/hermes-campaigns-ui/components/HermesCampaignReason';
export { HermesCampaignResultsSection } from '@/hermes-campaigns-ui/components/HermesCampaignResultsSection';
export { HermesCampaignSaveControl } from '@/hermes-campaigns-ui/components/HermesCampaignSaveControl';
export { HermesCampaignScreen } from '@/hermes-campaigns-ui/components/HermesCampaignScreen';
export type { HermesCampaignScreenProps } from '@/hermes-campaigns-ui/components/HermesCampaignScreen';
export { HermesMarketingObjectionSection } from '@/hermes-campaigns-ui/components/HermesMarketingObjectionSection';
export { HermesSenderIdentityCard } from '@/hermes-campaigns-ui/components/HermesSenderIdentityCard';
export { HermesSenderIdentitySection } from '@/hermes-campaigns-ui/components/HermesSenderIdentitySection';

export {
  HERMES_CAMPAIGN_BODY_MAX_LENGTH,
  HERMES_CAMPAIGN_SUBJECT_MAX_LENGTH,
  HERMES_CAMPAIGN_VARIABLE_PATTERN,
} from '@/hermes-campaigns-ui/constants/HermesCampaignLimits';

export type {
  HermesAudienceExclusion,
  HermesAudienceExclusionAggregate,
  HermesAudienceExclusionReason,
  HermesAudienceExclusionRow,
  HermesCampaignAudience,
  HermesCampaignCountSummary,
  HermesPersonalisationVariable,
} from '@/hermes-campaigns-ui/types/HermesCampaignAudience';
export type {
  HermesCampaignCapabilities,
  HermesCampaignCapability,
  HermesCampaignCapabilityName,
  HermesCampaignPermission,
  HermesCampaignRefusalOrigin,
} from '@/hermes-campaigns-ui/types/HermesCampaignCapability';
export type {
  HermesCampaignContent,
  HermesCampaignPreviewEnvelope,
  HermesCampaignPreviewState,
  HermesCampaignRecipientPreview,
} from '@/hermes-campaigns-ui/types/HermesCampaignContent';
export type {
  HermesCampaignIssue,
  HermesCampaignIssueCode,
} from '@/hermes-campaigns-ui/types/HermesCampaignIssue';
export type {
  HermesCampaignActionName,
  HermesCampaignActionOutcome,
  HermesCampaignEmissionKind,
  HermesCampaignSchedule,
  HermesCampaignState,
} from '@/hermes-campaigns-ui/types/HermesCampaignJourney';
export type { HermesCampaignListEntry } from '@/hermes-campaigns-ui/types/HermesCampaignListEntry';
export type { HermesCampaignLoad } from '@/hermes-campaigns-ui/types/HermesCampaignLoad';
export type { HermesCampaignPreviewRecipient } from '@/hermes-campaigns-ui/types/HermesCampaignPreviewRecipient';
export type { HermesCampaignSaveState } from '@/hermes-campaigns-ui/types/HermesCampaignSaveState';
export type {
  HermesCampaignEvidence,
  HermesCampaignMetric,
  HermesCampaignMetricReading,
  HermesCampaignMetricUnknownReason,
} from '@/hermes-campaigns-ui/types/HermesCampaignResult';
export type { HermesMarketingObjection } from '@/hermes-campaigns-ui/types/HermesMarketingObjection';
export type {
  HermesDelegatedMailbox,
  HermesSenderIdentity,
  HermesSenderIdentityState,
  HermesSenderIdentityVerdict,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentity';
export type {
  HermesSenderIdentityAuthorization,
  HermesSenderIdentityRefusalCode,
} from '@/hermes-campaigns-ui/types/HermesSenderIdentityAuthorization';

export {
  HERMES_AUDIENCE_EXCLUSION_REASONS,
  aggregateAudienceExclusions,
} from '@/hermes-campaigns-ui/utils/aggregateAudienceExclusions';
export {
  HERMES_IDENTITY_BOUND_CAPABILITIES,
  isHermesIdentityBoundCapability,
  readCampaignCapability,
} from '@/hermes-campaigns-ui/utils/readCampaignCapability';
export { readCampaignMetric } from '@/hermes-campaigns-ui/utils/readCampaignMetric';
export { readSenderIdentityAuthorization } from '@/hermes-campaigns-ui/utils/readSenderIdentityAuthorization';
export { readSenderIdentitySelectability } from '@/hermes-campaigns-ui/utils/readSenderIdentitySelectability';
export type { HermesSenderIdentitySelectability } from '@/hermes-campaigns-ui/utils/readSenderIdentitySelectability';
export {
  readCampaignContentVariables,
  validateCampaignContent,
} from '@/hermes-campaigns-ui/utils/validateCampaignContent';
export { validateCampaignSchedule } from '@/hermes-campaigns-ui/utils/validateCampaignSchedule';
export { validateTestDestination } from '@/hermes-campaigns-ui/utils/validateTestDestination';
export type { HermesTestDestinationVerdict } from '@/hermes-campaigns-ui/utils/validateTestDestination';
export type { ValidatedCampaignContent } from '@/hermes-campaigns-ui/utils/validateCampaignContent';
export type { ValidatedCampaignSchedule } from '@/hermes-campaigns-ui/utils/validateCampaignSchedule';
