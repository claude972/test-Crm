import { useLingui } from '@lingui/react/macro';

type HermesDateValueProps = {
  value: unknown;
};

export const HermesDateValue = ({ value }: HermesDateValueProps) => {
  const { t, i18n } = useLingui();

  if (typeof value !== 'string' && !(value instanceof Date)) {
    return <span>{t`Not set`}</span>;
  }

  const date = value instanceof Date ? value : new Date(value);

  // An unparseable timestamp is not a date. Saying so beats rendering
  // "Invalid Date" or today's date in its place.
  if (Number.isNaN(date.getTime())) {
    return <span>{t`Unavailable`}</span>;
  }

  return (
    <span>
      {i18n.date(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </span>
  );
};
