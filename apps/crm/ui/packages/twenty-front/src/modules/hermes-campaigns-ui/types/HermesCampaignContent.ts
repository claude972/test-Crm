import { type HermesPersonalisationVariable } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';

export type HermesCampaignContent = {
  subject: string;
  body: string;
};

// What a send would do with the envelope, as the server computed it.
//
// Every field is conditional: the campaign has not departed, so these say
// what a departure would carry, never what a recipient received. The screen
// keeps that tense in its wording.
export type HermesCampaignPreviewEnvelope = {
  fromAddress: string | null;
  // The server's own word for the sender's readiness. Not proof that a send
  // would succeed: it does not establish that the native mail connection and
  // the transport are usable, only what it checked.
  senderStatus: string | null;
  openMarkerWouldBeIncluded: boolean | null;
  clickTrackingWouldBeApplied: boolean | null;
  unsubscribeLinkWouldBeIncluded: boolean | null;
};

// One recipient's rendered content, as computed for display. Rendering a
// preview emits nothing: no transport is contacted, no recipient is reached,
// and the component says so where the person can read it.
export type HermesCampaignRecipientPreview = {
  // Who the preview was rendered for, for display. Null when the preview was
  // rendered without a named recipient.
  recipientLabel: string | null;
  recipientAddress: string | null;
  subject: string;
  // The plain-text rendering. The HTML rendering is deliberately never shown
  // as markup: the panel stays inert, so nothing executes, no remote image
  // loads and the recipient's tracking pixel is never fetched. A preview must
  // not be able to fabricate an open.
  body: string;
  // Variables with no value for this recipient. Shown as missing, never
  // silently replaced by an empty string.
  missingVariables: HermesPersonalisationVariable[];
  // The variables the server actually resolved for this rendering. Not the
  // complement of `missingVariables`: the operation publishes what it used,
  // and says nothing about what had no value.
  variablesUsed: string[];
  // Whether this person would actually be sent to, and why not. A person can
  // be previewed while excluded: the exclusion is shown rather than the row
  // hidden. Null when the server published nothing readable.
  isRecipientSendable: boolean | null;
  exclusionReason: string | null;
  envelope: HermesCampaignPreviewEnvelope | null;
};

export type HermesCampaignPreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; preview: HermesCampaignRecipientPreview }
  // The preview itself failed. A failed preview is not an empty preview.
  | { kind: 'failed'; reasonCode: string | null; reason: string | null };
