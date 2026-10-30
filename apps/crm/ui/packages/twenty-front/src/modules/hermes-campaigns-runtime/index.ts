// What a route consumes: one container, plugged into the native emailing
// engine. Everything else in this module is its wiring.
export {
  HermesCampaignRuntimeContainer,
  type HermesCampaignRuntimeContainerProps,
} from '@/hermes-campaigns-runtime/components/HermesCampaignRuntimeContainer';
export { useHermesCampaignRuntime } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignRuntime';
