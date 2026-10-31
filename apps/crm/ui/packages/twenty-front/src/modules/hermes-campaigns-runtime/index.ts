// What a route consumes: one container, plugged into the native emailing
// engine. Everything else in this module is its wiring.
export {
  HermesCampaignRuntimeContainer,
  type HermesCampaignRuntimeContainerProps,
} from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
export { useHermesCampaignRuntime } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignRuntime';
export {
  HermesCampaignListContainer,
  type HermesCampaignListContainerProps,
} from '@/hermes-campaigns-runtime/components/HermesCampaignListContainer';
export {
  useHermesRuntimeCampaignList,
  HERMES_RUNTIME_CAMPAIGN_PAGE_SIZE,
  type HermesCampaignCreateState,
} from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignList';
export {
  useHermesRuntimeCampaignRecipients,
  HERMES_RUNTIME_PREVIEW_RECIPIENT_LIMIT,
} from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignRecipients';
export { useHermesCampaignPersistence } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignPersistence';
export {
  useHermesRuntimeCampaignAudiences,
  HERMES_RUNTIME_AUDIENCE_PAGE_SIZE,
} from '@/hermes-campaigns-runtime/hooks/useHermesRuntimeCampaignAudiences';
