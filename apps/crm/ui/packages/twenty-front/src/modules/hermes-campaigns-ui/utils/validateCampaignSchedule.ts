import {
  type HermesCampaignIssue,
  type HermesCampaignIssueCode,
} from '@/hermes-campaigns-ui/types/HermesCampaignIssue';
import { type HermesCampaignSchedule } from '@/hermes-campaigns-ui/types/HermesCampaignJourney';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WALL_CLOCK_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const isKnownTimeZone = (timeZone: string): boolean => {
  try {
    // The platform is the only authority on zone names here. A name it
    // rejects is reported as unknown rather than passed to the server.
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

type ValidateCampaignScheduleArgs = {
  date: string;
  time: string;
  timeZone: string;
};

export type ValidatedCampaignSchedule = {
  // Null when any check failed: nothing half-valid is handed to a caller.
  schedule: HermesCampaignSchedule | null;
  issues: HermesCampaignIssue[];
};

// Checks the three parts of a scheduled moment: a wall-clock time without a
// zone is not a moment, so the zone is required rather than guessed. It does
// not decide whether scheduling is permitted — a valid form never implies a
// capability.
export const validateCampaignSchedule = ({
  date,
  time,
  timeZone,
}: ValidateCampaignScheduleArgs): ValidatedCampaignSchedule => {
  const issues: HermesCampaignIssue[] = [];
  const addIssue = (code: HermesCampaignIssueCode) => {
    issues.push({ key: code, code });
  };

  const trimmedDate = date.trim();
  const trimmedTime = time.trim();
  const trimmedTimeZone = timeZone.trim();

  if (trimmedDate.length === 0) {
    addIssue('schedule-date-required');
  } else if (
    !ISO_DATE.test(trimmedDate) ||
    Number.isNaN(new Date(`${trimmedDate}T00:00:00Z`).getTime())
  ) {
    addIssue('schedule-date-not-iso');
  }

  if (trimmedTime.length === 0) {
    addIssue('schedule-time-required');
  } else if (!WALL_CLOCK_TIME.test(trimmedTime)) {
    addIssue('schedule-time-not-valid');
  }

  if (trimmedTimeZone.length === 0) {
    addIssue('schedule-time-zone-required');
  } else if (!isKnownTimeZone(trimmedTimeZone)) {
    addIssue('schedule-time-zone-unknown');
  }

  if (issues.length > 0) {
    return { schedule: null, issues };
  }

  return {
    schedule: {
      date: trimmedDate,
      time: trimmedTime,
      timeZone: trimmedTimeZone,
    },
    issues: [],
  };
};
