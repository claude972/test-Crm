import { getTimezoneAbbreviationForZonedDateTime } from '@/ui/input/components/internal/date/utils/getTimeZoneAbbreviationForZonedDateTime';
import { Temporal } from 'temporal-polyfill';

import { type RelativeDateFilter } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const getRelativeDateFilterTimeZoneAbbreviation = (
  relativeDate: RelativeDateFilter,
) => {
  const nowZonedDateTime = Temporal.Now.zonedDateTimeISO(
    relativeDate.timezone ?? doNotTranslate('UTC'),
  );

  const timeZoneAbbreviation =
    getTimezoneAbbreviationForZonedDateTime(nowZonedDateTime);

  return timeZoneAbbreviation;
};
