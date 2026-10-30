import { isNonEmptyString } from '@sniptt/guards';

// Three different facts, never collapsed into one:
// - 'never': the server has not checked, which is not a healthy connector;
// - 'unreadable': a timestamp came back that cannot be read, so the time of
//   the last check is unknown — reporting it as 'never' would be a guess;
// - 'at': a usable instant.
export type ConnectorCheckedAt =
  | { kind: 'never' }
  | { kind: 'unreadable' }
  | { kind: 'at'; date: Date };

export const parseConnectorCheckedAt = (
  checkedAt: string | null | undefined,
): ConnectorCheckedAt => {
  const trimmed = checkedAt?.trim();

  if (!isNonEmptyString(trimmed)) {
    return { kind: 'never' };
  }

  const date = new Date(trimmed);

  // new Date('whatever') is an Invalid Date, and formatting one throws a
  // RangeError that would take the whole settings page down.
  if (Number.isNaN(date.getTime())) {
    return { kind: 'unreadable' };
  }

  return { kind: 'at', date };
};
