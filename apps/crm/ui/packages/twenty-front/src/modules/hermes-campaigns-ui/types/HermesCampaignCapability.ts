// The five capabilities of a campaign, each computed by the server and never
// deduced here. An interface boolean authorises nothing: the only thing that
// turns a control on is a published `allowed: true`.
export type HermesCampaignCapabilityName =
  | 'preview'
  | 'testSynthetic'
  | 'schedule'
  | 'send'
  | 'cancel';

export type HermesCampaignCapability = {
  // true only when the server said true. false when it said false. null when
  // it published nothing readable — which is not a permission either.
  allowed: boolean | null;
  // The code as published, for the refusals. Null when there is none.
  reasonCode: string | null;
  // The server's sentence, when it published one.
  reason: string | null;
  // Who closed this step. Omitted means the server did, which is the normal
  // case. It is set to 'client' only for a step this build has no operation
  // for, so the screen does not report a missing feature as a refusal the
  // server issued.
  origin?: HermesCampaignRefusalOrigin;
};

export type HermesCampaignCapabilities = {
  preview: HermesCampaignCapability;
  testSynthetic: HermesCampaignCapability;
  schedule: HermesCampaignCapability;
  send: HermesCampaignCapability;
  cancel: HermesCampaignCapability;
  // When the server computed this set, as published (ISO 8601 expected).
  // Null when unknown: the screen then says the age is unknown rather than
  // presenting the set as fresh.
  checkedAt: string | null;
};

// Where a refusal came from. The server's own refusal is one thing; a refusal
// because the identity the action would run under is not authorised is
// another, and the person reading the screen needs to know which.
// 'client' is this build itself: the server may well permit the step, but no
// operation is wired here to carry it out. It is kept distinct from a server
// refusal because attributing a missing implementation to the server would
// send somebody looking for a permission problem that does not exist.
export type HermesCampaignRefusalOrigin =
  | 'server'
  | 'sender-identity'
  | 'client';

// What the interface may do with a capability. Three answers, not two:
// refused and unknown read differently on screen, and both keep the control
// shut.
export type HermesCampaignPermission =
  | { kind: 'allowed' }
  | {
      kind: 'refused';
      origin: HermesCampaignRefusalOrigin;
      reasonCode: string | null;
      reason: string | null;
    }
  // The server published no readable flag. Unverified is unavailable.
  | { kind: 'unknown' };
