import { HermesCampaignScreen } from '@/hermes-campaigns-ui/components/HermesCampaignScreen';
import { useHermesCampaignRuntime } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignRuntime';

export type HermesCampaignRuntimeContainerProps = {
  // The campaign this screen is about. A route passes it through; nothing is
  // read from a context so the container stays usable anywhere.
  campaignId: string;
};

// The campaign screen, plugged into the emailing engine this workspace runs.
//
// Every prop is passed by name rather than spread, so what is wired and what
// is not can be read here in one place. Three callbacks are missing on
// purpose, and each one leaves its control shut with a reason in the page:
//
// - onPreview: nothing in the schema renders a campaign for a recipient.
// - onSendSyntheticTest: a test is a real emission, the operation accepts any
//   destination with no staging restriction, the screen offers no field where
//   a human could name one, and the server publishes no capability for it.
// - onSend: an immediate send is never wired from this container.
//
// Nothing here emits at mount: the two wired actions are mutations held by
// callbacks and fired only by a human pressing a control the server opened.
export const HermesCampaignRuntimeContainer = ({
  campaignId,
}: HermesCampaignRuntimeContainerProps) => {
  const runtime = useHermesCampaignRuntime({ campaignId });

  return (
    <HermesCampaignScreen
      campaignName={runtime.campaignName}
      campaignState={runtime.campaignState}
      senderIdentitiesLoad={runtime.senderIdentitiesLoad}
      selectedIdentityId={runtime.selectedIdentityId}
      onSelectIdentity={runtime.onSelectIdentity}
      onRetrySenderIdentities={runtime.onRetrySenderIdentities}
      capabilitiesLoad={runtime.capabilitiesLoad}
      onRetryCapabilities={runtime.onRetryCapabilities}
      audienceLoad={runtime.audienceLoad}
      onRetryAudience={runtime.onRetryAudience}
      content={runtime.content}
      onContentChange={runtime.onContentChange}
      previewState={runtime.previewState}
      scheduleDraft={runtime.scheduleDraft}
      onScheduleDraftChange={runtime.onScheduleDraftChange}
      timeZones={runtime.timeZones}
      scheduledAt={runtime.scheduledAt}
      actionOutcome={runtime.actionOutcome}
      onSchedule={runtime.onSchedule}
      onCancelSchedule={runtime.onCancelSchedule}
      resultsLoad={runtime.resultsLoad}
      onRetryResults={runtime.onRetryResults}
      objectionsLoad={runtime.objectionsLoad}
    />
  );
};
