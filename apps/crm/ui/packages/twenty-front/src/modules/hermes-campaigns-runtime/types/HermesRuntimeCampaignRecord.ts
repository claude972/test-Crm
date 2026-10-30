// The campaign as the core schema publishes it. Every figure is optional and
// nullable on purpose: a field the server did not answer with must arrive here
// as absent, never as a zero.
export type HermesRuntimeCampaignRecord = {
  __typename?: string;
  id: string;
  name?: string | null;
  subject?: string | null;
  bodyTemplate?: string | null;
  fromAddress?: { primaryEmail?: string | null } | null;
  listId?: string | null;
  unsubscribeTopicId?: string | null;
  // The published status string. Kept as a string, not an enum, so a value
  // outside the contract can be reported instead of being coerced.
  status?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
  sentCount?: number | null;
  deliveredCount?: number | null;
  failedCount?: number | null;
  bouncedCount?: number | null;
  complainedCount?: number | null;
  skippedCount?: number | null;
  uniqueOpenCount?: number | null;
  uniqueClickCount?: number | null;
};

export type HermesRuntimeCampaignRecordQuery = {
  messageCampaign?: HermesRuntimeCampaignRecord | null;
};
