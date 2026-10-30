import { useLingui } from '@lingui/react/macro';

import { parseMessagingInboxInstant } from '@/messaging-inbox/utils/parseMessagingInboxInstant';

type MessagingInboxInstantLabelProps = {
  value: string | null;
};

// An instant, or the honest absence of one. An unreadable timestamp reads as
// unknown rather than as "never": the message did happen.
export const MessagingInboxInstantLabel = ({
  value,
}: MessagingInboxInstantLabelProps) => {
  const { t, i18n } = useLingui();

  const instant = parseMessagingInboxInstant(value);

  if (instant.kind === 'absent') {
    return <>{t`No time given`}</>;
  }

  if (instant.kind === 'unreadable') {
    return <>{t`Time unknown`}</>;
  }

  return (
    <time dateTime={instant.date.toISOString()}>
      {i18n.date(instant.date, { dateStyle: 'medium', timeStyle: 'short' })}
    </time>
  );
};
