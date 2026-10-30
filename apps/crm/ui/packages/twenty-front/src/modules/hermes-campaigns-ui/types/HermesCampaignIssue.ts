// One failed client-side check, as a code rather than as a sentence: the rule
// lives in the validator, the wording lives in the component, so each message
// stays translatable in one place.
export type HermesCampaignIssueCode =
  | 'schedule-date-required'
  | 'schedule-date-not-iso'
  | 'schedule-time-required'
  | 'schedule-time-not-valid'
  | 'schedule-time-zone-required'
  | 'schedule-time-zone-unknown'
  | 'schedule-moment-in-the-past'
  | 'subject-required'
  | 'subject-too-long'
  | 'body-required'
  | 'body-too-long'
  | 'body-variable-not-declared';

export type HermesCampaignIssue = {
  // Stable list key, unique within one validation pass.
  key: string;
  code: HermesCampaignIssueCode;
  limit?: number;
  variableName?: string;
};
