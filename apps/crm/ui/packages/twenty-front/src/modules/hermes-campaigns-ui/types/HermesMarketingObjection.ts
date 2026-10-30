// A durable marketing objection. It is a standing proof carried by the
// contact, and it is not the deal stage, not the bot mode, and not a channel
// being disconnected. Recording one excludes the contact from emissions and
// changes neither their stage nor their history.
export type HermesMarketingObjection = {
  id: string;
  contactLabel: string | null;
  contactAddress: string | null;
  // What the objection covers, for instance B2B prospecting.
  scope: string | null;
  // When it was recorded, as published (ISO 8601 expected).
  recordedAt: string | null;
  // How it reached the product: an unsubscribe link, a reply, a manual entry.
  origin: string | null;
  // The commercial stage as it stands. Shown precisely because the objection
  // does not move it.
  pipelineStageLabel: string | null;
  // The bot mode as it stands, for the same reason.
  botModeLabel: string | null;
};
