// The five steps of the journey. A preview emits nothing; a synthetic test is
// a real emission the server restricts to staging destinations, never to a
// prospect; a send is a send. The interface never blurs the three.
export type HermesCampaignActionName =
  | 'preview'
  | 'testSynthetic'
  | 'schedule'
  | 'cancelSchedule'
  | 'send';

// What an action does to the outside world, said in the type rather than left
// to a label.
export type HermesCampaignEmissionKind =
  | 'none'
  | 'staging-destinations-only'
  | 'recipients';

export type HermesCampaignSchedule = {
  // Local calendar date, 'YYYY-MM-DD', as an <input type="date"> carries it.
  date: string;
  // Local time of day, 'HH:mm'.
  time: string;
  // IANA zone name, for instance 'Europe/Paris'. A wall-clock time without a
  // zone is not a moment.
  timeZone: string;
};

export type HermesCampaignState =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'cancelled';

export type HermesCampaignActionOutcome =
  | { kind: 'running'; action: HermesCampaignActionName }
  | {
      kind: 'succeeded';
      action: HermesCampaignActionName;
      // What the server did, in its own words. Absent means the screen says
      // only that the call was accepted, never what it accomplished.
      detail: string | null;
    }
  | {
      kind: 'failed';
      action: HermesCampaignActionName;
      reasonCode: string | null;
      reason: string | null;
    };
