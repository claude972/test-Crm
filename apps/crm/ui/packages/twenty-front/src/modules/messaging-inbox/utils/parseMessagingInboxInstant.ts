import { isNonEmptyString } from '@sniptt/guards';

// Three different facts, never collapsed into one:
// - 'absent': the server sent no instant;
// - 'unreadable': an instant came back that cannot be parsed, so the time is
//   unknown — showing it as absent would be a guess;
// - 'at': a usable instant.
export type MessagingInboxInstant =
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'at'; date: Date };

export const parseMessagingInboxInstant = (
  value: string | null | undefined,
): MessagingInboxInstant => {
  const trimmed = value?.trim();

  if (!isNonEmptyString(trimmed)) {
    return { kind: 'absent' };
  }

  const date = new Date(trimmed);

  // new Date('whatever') is an Invalid Date, and formatting one throws a
  // RangeError that would take the whole inbox down.
  if (Number.isNaN(date.getTime())) {
    return { kind: 'unreadable' };
  }

  return { kind: 'at', date };
};
