import { HermesCampaignScreen } from '@/hermes-campaigns-ui/components/HermesCampaignScreen';
import { useHermesCampaignRuntime } from '@/hermes-campaigns-runtime/hooks/useHermesCampaignRuntime';

export type HermesCampaignRuntimeContainerProps = {
  // The campaign this screen is about. A route passes it through; nothing is
  // read from a context so the container stays usable anywhere.
  campaignId: string;
};

// The campaign screen, plugged into the emailing engine this workspace runs.
//
// Every prop is passed by name rather than spread, so what is wired can be
// read here in one place. Every callback the screen accepts is now wired,
// including the three that used to be left out: the recipient preview, the
// test to an address the operator types, and the immediate send.
//
// Leaving them out was the defect. A step that the server does not permit is
// still shut — an absent sender, an unverified domain or a campaign that is
// not a draft all close their controls with the reason shown in the page —
// but it is the server's verdict that closes them, not a missing callback.
// The guard refuses; the wiring is there.
//
// Nothing here emits at mount. Every mutation sits behind a callback fired
// only by a human pressing a control the server opened, the immediate send
// additionally behind a confirmation made in the page, and an emission whose
// outcome is unknown shuts the emitting steps instead of offering a retry.
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
      senderSaveState={runtime.senderSaveState}
      capabilitiesLoad={runtime.capabilitiesLoad}
      onRetryCapabilities={runtime.onRetryCapabilities}
      audienceLoad={runtime.audienceLoad}
      onRetryAudience={runtime.onRetryAudience}
      audiencesLoad={runtime.audiencesLoad}
      onRetryAudiences={runtime.onRetryAudiences}
      selectedListId={runtime.selectedListId}
      onSelectList={runtime.onSelectList}
      listSaveState={runtime.listSaveState}
      unsubscribeTopics={runtime.unsubscribeTopics}
      selectedTopicId={runtime.selectedTopicId}
      onSelectTopic={runtime.onSelectTopic}
      topicSaveState={runtime.topicSaveState}
      isSenderRecorded={runtime.isSenderRecorded}
      onRecordSender={runtime.onRecordSender}
      content={runtime.content}
      onContentChange={runtime.onContentChange}
      contentSaveState={runtime.contentSaveState}
      onSaveContent={runtime.onSaveContent}
      previewState={runtime.previewState}
      previewRecipients={runtime.previewRecipients}
      selectedPreviewRecipientId={runtime.selectedPreviewRecipientId}
      onSelectPreviewRecipient={runtime.onSelectPreviewRecipient}
      testDestination={runtime.testDestination}
      onTestDestinationChange={runtime.onTestDestinationChange}
      scheduleDraft={runtime.scheduleDraft}
      onScheduleDraftChange={runtime.onScheduleDraftChange}
      timeZones={runtime.timeZones}
      scheduledAt={runtime.scheduledAt}
      actionOutcome={runtime.actionOutcome}
      hasUncertainEmission={runtime.hasUncertainEmission}
      onPreview={runtime.onPreview}
      onSendSyntheticTest={runtime.onSendSyntheticTest}
      onSchedule={runtime.onSchedule}
      onCancelSchedule={runtime.onCancelSchedule}
      onSend={runtime.onSend}
      resultsLoad={runtime.resultsLoad}
      onRetryResults={runtime.onRetryResults}
      objectionsLoad={runtime.objectionsLoad}
    />
  );
};
