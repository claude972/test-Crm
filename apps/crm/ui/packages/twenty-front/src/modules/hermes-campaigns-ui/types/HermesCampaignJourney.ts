// The steps of the journey. A preview emits nothing; a test is a real
// emission to one address a person typed; a send is a send. The interface
// never blurs the three.
//
// On the test: `SendMessageCampaignTestInput.toAddress` is validated as an
// e-mail address and nothing more — the server applies no staging allowlist
// and no domain restriction to it. So the destination is whatever was typed,
// the screen says so next to the field, and the operator is the only guard.
// An earlier comment here claimed the server restricted tests to staging
// destinations; it does not, and promising that would be the more dangerous
// error.
export type HermesCampaignActionName =
  | 'preview'
  | 'testSynthetic'
  | 'schedule'
  | 'cancelSchedule'
  | 'send'
  // Recording the campaign's own fields. It emits nothing, and it is named
  // here so a failed recording is reported through the same outcome channel
  // as the rest rather than disappearing into a toast.
  | 'saveContent'
  | 'saveSender';

// What an action does to the outside world, said in the type rather than left
// to a label.
//
// 'typed-destination' replaces an earlier 'staging-destinations-only': the
// server applies no staging allowlist to a test, so the only true statement
// is that one real message goes to the one address somebody typed. The label
// has to carry that, because the person pressing the button is the only
// safeguard there is.
export type HermesCampaignEmissionKind =
  | 'none'
  | 'typed-destination'
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
    }
  // The call left and its outcome is not known: a dropped connection, an
  // answer this screen could not read. For an emitting action this is the
  // most dangerous state there is, because a message may already be on its
  // way. It is not a failure and it is not a success, so the screen offers no
  // retry: it shuts the emitting steps and asks for the campaign to be
  // re-read. The engine quarantines such a result server side and never
  // releases it automatically, and this is the interface saying the same
  // thing.
  | {
      kind: 'unconfirmed';
      action: HermesCampaignActionName;
      reasonCode: string | null;
      reason: string | null;
    };
