import { type HermesPersonalisationVariable } from '@/hermes-campaigns-ui/types/HermesCampaignAudience';

export type HermesCampaignContent = {
  subject: string;
  body: string;
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
  body: string;
  // Variables with no value for this recipient. Shown as missing, never
  // silently replaced by an empty string.
  missingVariables: HermesPersonalisationVariable[];
};

export type HermesCampaignPreviewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; preview: HermesCampaignRecipientPreview }
  // The preview itself failed. A failed preview is not an empty preview.
  | { kind: 'failed'; reasonCode: string | null; reason: string | null };
