import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';

// Three facts, never collapsed into one: no instant was sent, an instant came
// back that cannot be parsed, or a usable instant. An unreadable timestamp
// reads as unknown rather than as "never": the message did happen.
const parseInstant = (
  value: string | null,
): { kind: 'absent' } | { kind: 'unreadable' } | { kind: 'at'; date: Date } => {
  const trimmed = value?.trim();

  if (!isNonEmptyString(trimmed)) {
    return { kind: 'absent' };
  }

  const date = new Date(trimmed);

  // Formatting an Invalid Date throws a RangeError, which would take the whole
  // mailbox down.
  return Number.isNaN(date.getTime())
    ? { kind: 'unreadable' }
    : { kind: 'at', date };
};

type HermesMailboxInstantLabelProps = {
  value: string | null;
  // A row has no space for a full date; a message header does.
  density?: 'short' | 'full';
};

export const HermesMailboxInstantLabel = ({
  value,
  density = 'full',
}: HermesMailboxInstantLabelProps) => {
  const { t, i18n } = useLingui();

  const instant = parseInstant(value);

  if (instant.kind === 'absent') {
    return <>{t`No date given`}</>;
  }

  if (instant.kind === 'unreadable') {
    return <>{t`Date unknown`}</>;
  }

  return (
    <time dateTime={instant.date.toISOString()}>
      {density === 'short'
        ? i18n.date(instant.date, { dateStyle: 'short' })
        : i18n.date(instant.date, { dateStyle: 'medium', timeStyle: 'short' })}
    </time>
  );
};
