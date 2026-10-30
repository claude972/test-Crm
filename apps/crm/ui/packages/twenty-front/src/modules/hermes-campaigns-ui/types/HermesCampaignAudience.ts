// The four exclusion reasons of the contract. A durable marketing objection
// is one of them and is not the same fact as an invalid address: the first is
// a standing refusal by a person, the second a defect in a string.
export type HermesAudienceExclusionReason =
  | 'marketing-objection'
  | 'resolved-duplicate'
  | 'invalid-address'
  | 'incomplete-qualification';

export type HermesAudienceExclusion = {
  // Null when the published reason was not one of the four. The raw code then
  // travels in unknownReason so the screen can name what it received.
  reason: HermesAudienceExclusionReason | null;
  unknownReason: string | null;
  // Null when the server published no readable figure. Null is not zero.
  count: number | null;
};

export type HermesPersonalisationVariable = {
  // The variable as written in the content, without its braces.
  name: string;
  // Records where the variable has no value. Null when unknown, which is not
  // the same as a variable known to be complete.
  missingCount: number | null;
};

export type HermesCampaignAudience = {
  // Recipients the server retained, after its own exclusions. Null when it
  // published no readable figure.
  retainedCount: number | null;
  exclusions: HermesAudienceExclusion[];
  variables: HermesPersonalisationVariable[];
};

// A figure that may be complete, complete only over what was readable, or
// not known at all. A partial sum carries how many entries it could not add.
export type HermesCampaignCountSummary =
  | { kind: 'exact'; value: number }
  | { kind: 'partial'; value: number; unreadableEntryCount: number }
  | { kind: 'unknown'; unreadableEntryCount: number };

export type HermesAudienceExclusionRow = {
  // Stable list key.
  key: string;
  reason: HermesAudienceExclusionReason | null;
  unknownReason: string | null;
  count: HermesCampaignCountSummary;
};

export type HermesAudienceExclusionAggregate = {
  // One row per reason actually published, contract reasons first, in the
  // order of the contract, then the reasons outside it.
  rows: HermesAudienceExclusionRow[];
  // Every excluded record, across reasons.
  total: HermesCampaignCountSummary;
  // Entries whose reason fell outside the contract.
  unknownReasonEntryCount: number;
};
