// Six facts the results keep apart. None of them implies another:
// an acceptance by the SMTP server is a handover, not a delivery; an observed
// open is a request for an image or a link, not a human reading; and an
// uncertain outcome is reconciled, never resent blind.
export type HermesCampaignEvidence =
  | 'SMTP_ACCEPTED'
  | 'PROVIDER_DELIVERED'
  | 'DELIVERY_FAILED'
  | 'OUTCOME_UNCERTAIN'
  | 'REPLY_CORRELATED'
  | 'OPEN_OBSERVED';

// Why a figure is not known. Every one of these renders as unknown, and none
// of them renders as zero.
export type HermesCampaignMetricUnknownReason =
  // The server published nothing for this measure.
  | 'not-published'
  // Open tracking is off, so no pixel and no tracking link exist to count.
  | 'tracking-disabled'
  // The measure needs an authenticated provider event that has not arrived.
  | 'provider-event-missing'
  // Something was published but it was not a usable count.
  | 'unreadable';

export type HermesCampaignMetric = {
  evidence: HermesCampaignEvidence;
  // A known count, zero included. Null whenever the count is not known.
  value: number | null;
  // Set whenever the server knew why the figure is missing. A null here with
  // a null value still reads as unknown, under 'not-published'.
  unknownReason: HermesCampaignMetricUnknownReason | null;
  // The server's sentence about this measure, when it published one.
  note: string | null;
};

export type HermesCampaignMetricReading =
  // Zero is a figure. It lands here, not in 'unknown'.
  | { kind: 'known'; value: number }
  | { kind: 'unknown'; reason: HermesCampaignMetricUnknownReason };
