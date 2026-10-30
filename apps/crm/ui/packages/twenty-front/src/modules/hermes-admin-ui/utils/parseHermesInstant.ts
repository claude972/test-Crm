import { isNonEmptyString } from '@sniptt/guards';

// Three different facts about an instant, never collapsed into one:
// - 'absent': the server sent none;
// - 'unreadable': something came back that cannot be parsed, so the time is
//   unknown — showing it as absent would be a guess;
// - 'at': a usable instant.
export type HermesInstant =
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'at'; date: Date };

export const parseHermesInstant = (
  value: string | null | undefined,
): HermesInstant => {
  const trimmed = value?.trim();

  if (!isNonEmptyString(trimmed)) {
    return { kind: 'absent' };
  }

  const date = new Date(trimmed);

  // new Date('whatever') is an Invalid Date, and formatting one throws a
  // RangeError that would take the whole settings centre down.
  if (Number.isNaN(date.getTime())) {
    return { kind: 'unreadable' };
  }

  return { kind: 'at', date };
};
