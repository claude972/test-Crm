import { isNonEmptyString } from '@sniptt/guards';
import { MessageCampaignStatus } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

import {
  type HermesCampaignSchedule,
  type HermesCampaignState,
} from '@/hermes-campaigns-ui/types/HermesCampaignJourney';
import {
  type HermesCampaignEvidence,
  type HermesCampaignMetric,
} from '@/hermes-campaigns-ui/types/HermesCampaignResult';
import { type HermesRuntimeCampaignRecord } from '@/hermes-campaigns-runtime/types/HermesRuntimeCampaignRecord';

// The published status, mapped onto the five states the screen knows. A
// status outside the contract is not mapped: it comes back as null so the
// caller can say the state is unknown rather than pick one.
export const readRuntimeCampaignState = (
  status: string | null | undefined,
): HermesCampaignState | null => {
  switch (status) {
    case MessageCampaignStatus.DRAFT:
      return 'draft';
    case MessageCampaignStatus.SCHEDULED:
      return 'scheduled';
    case MessageCampaignStatus.SENDING:
      return 'sending';
    case MessageCampaignStatus.SENT:
    // A send that ended with errors is over: it is not still sending, and the
    // failures are counted in the results rather than hidden in the state.
    case MessageCampaignStatus.SENT_WITH_ERRORS:
      return 'sent';
    case MessageCampaignStatus.CANCELED:
      return 'cancelled';
    default:
      return null;
  }
};

// The statuses the server will accept a cancellation from. Taken from the
// lifecycle service's own guard, which refuses every other status with
// MESSAGE_CAMPAIGN_NOT_CANCELABLE and re-checks it on the call itself.
export const RUNTIME_CANCELABLE_STATUSES: readonly string[] = [
  MessageCampaignStatus.SCHEDULED,
  MessageCampaignStatus.SENDING,
];

// The recorded moment, read back as a wall-clock moment in UTC.
//
// The server publishes an instant and no zone, so the instant is shown in the
// one zone it is exact in. Rendering it in a zone the server never named
// would be a fact nobody stated.
export const readRuntimeSchedule = (
  scheduledAt: string | null | undefined,
): HermesCampaignSchedule | null => {
  if (!isNonEmptyString(scheduledAt)) {
    return null;
  }

  const moment = new Date(scheduledAt);

  if (Number.isNaN(moment.getTime())) {
    return null;
  }

  const asIso = moment.toISOString();

  return {
    date: asIso.slice(0, 10),
    time: asIso.slice(11, 16),
    timeZone: 'UTC',
  };
};

const getTimeZoneOffsetMs = (
  instantMs: number,
  timeZone: string,
): number | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(instantMs));

    const read = (type: string): number => {
      const value = parts.find((part) => part.type === type)?.value;

      return isDefined(value) ? Number(value) : Number.NaN;
    };

    const asUtc = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour') % 24,
      read('minute'),
      read('second'),
    );

    return Number.isNaN(asUtc) ? null : asUtc - instantMs;
  } catch {
    return null;
  }
};

// Turns a chosen wall-clock moment into the instant the server's DateTime
// argument expects.
//
// The offset is read twice because the first read uses the wall clock as if
// it were UTC, which lands on the wrong side of a daylight-saving change. A
// zone the platform rejects, or a moment that does not resolve, returns null:
// the caller then refuses the action rather than sending an instant nobody
// picked.
export const buildRuntimeScheduleInstant = (
  schedule: HermesCampaignSchedule,
): string | null => {
  const asIfUtc = new Date(`${schedule.date}T${schedule.time}:00Z`).getTime();

  if (Number.isNaN(asIfUtc)) {
    return null;
  }

  const firstOffset = getTimeZoneOffsetMs(asIfUtc, schedule.timeZone);

  if (!isDefined(firstOffset)) {
    return null;
  }

  const secondOffset = getTimeZoneOffsetMs(
    asIfUtc - firstOffset,
    schedule.timeZone,
  );

  if (!isDefined(secondOffset)) {
    return null;
  }

  const instant = new Date(asIfUtc - secondOffset);

  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
};

const readPublishedCount = (count: number | null | undefined): number | null =>
  isDefined(count) ? count : null;

// The six facts the results keep apart, each filled only from a figure the
// server published.
//
// Three of them have no counterpart on the record: nothing in the schema
// publishes an uncertain outcome, a correlated reply, or whether open
// tracking was on. They stay unknown under 'not-published', because a missing
// figure is not a zero and an absent fact is not a negative one.
export const buildRuntimeMetrics = (
  campaign: HermesRuntimeCampaignRecord,
): HermesCampaignMetric[] => {
  const published = (
    evidence: HermesCampaignEvidence,
    count: number | null | undefined,
  ): HermesCampaignMetric => ({
    evidence,
    value: readPublishedCount(count),
    unknownReason: isDefined(count) ? null : 'not-published',
    note: null,
  });

  return [
    // What the sending server took off our hands. It is a handover, not a
    // delivery, and the two are never added together.
    published('SMTP_ACCEPTED', campaign.sentCount),
    published('PROVIDER_DELIVERED', campaign.deliveredCount),
    // Only the failure count the record publishes under that name. Bounces
    // and complaints are their own facts and are not folded in here.
    published('DELIVERY_FAILED', campaign.failedCount),
    {
      evidence: 'OUTCOME_UNCERTAIN',
      value: null,
      unknownReason: 'not-published',
      note: null,
    },
    {
      evidence: 'REPLY_CORRELATED',
      value: null,
      unknownReason: 'not-published',
      note: null,
    },
    published('OPEN_OBSERVED', campaign.uniqueOpenCount),
  ];
};
