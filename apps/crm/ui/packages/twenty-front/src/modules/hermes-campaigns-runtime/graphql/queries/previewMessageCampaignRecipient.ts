import { gql } from '@apollo/client';

// Renders a campaign for one recipient, without emitting anything.
//
// Published by the campaign API lot; the contract lives in
// `docs/handoff/hermes-v4-campaign-recipient-preview-contract.md`. Two
// behaviours this screen depends on:
//
// - `personId` omitted renders the first sendable recipient in the engine's
//   own order, so a preview can be asked for before anyone is picked.
// - `personId` given renders that person even when they are currently
//   excluded, and `isRecipientSendable` with `recipientExclusionReason` say
//   why. The exclusion is shown rather than the row hidden.
//
// Every `envelope` field is conditional on a send that has not happened:
// `senderStatus` is not proof a send would succeed, and the `…WouldBe…`
// fields describe what a departure would do. The screen keeps that tense.
//
// This also carries content validation the save path cannot do: a draft
// persisted through the generic record update runs neither the document
// stamping nor the known-variable assertion, which only run at send time. So
// an unknown variable or a malformed body is reported here, before sending,
// and belongs next to the content rather than in a transient toast.
export const PREVIEW_MESSAGE_CAMPAIGN_RECIPIENT = gql`
  query PreviewMessageCampaignRecipient(
    $input: PreviewMessageCampaignRecipientInput!
  ) {
    previewMessageCampaignRecipient(input: $input) {
      personId
      email
      subject
      html
      plainText
      variablesUsed
      isRecipientSendable
      recipientExclusionReason
      envelope {
        fromAddress
        senderStatus
        openMarkerWouldBeIncluded
        clickTrackingWouldBeApplied
        unsubscribeLinkWouldBeIncluded
      }
    }
  }
`;
