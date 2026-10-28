import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { detectCalendarStartDay } from '@/localization/utils/detection/detectCalendarStartDay';
import { getRecordCalendarDaysRange } from '@/object-record/record-calendar/utils/getRecordCalendarDaysRange';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { format } from 'date-fns';
import { type Temporal } from 'temporal-polyfill';
import { CalendarStartDay } from 'kovaa-lab-shared/constants';
import { turnPlainDateToShiftedDateInSystemTimeZone } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
import { type ViewCalendarLayout } from '~/generated-metadata/graphql';
import { dateLocaleState } from '@/localization/states/dateLocaleState';

export const useRecordCalendarDaysRange = (
  selectedDate: Temporal.PlainDate,
  calendarLayout: ViewCalendarLayout,
) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const dateLocale = useAtomStateValue(dateLocaleState);
  const calendarStartDay =
    currentWorkspaceMember?.calendarStartDay ?? CalendarStartDay.SYSTEM;
  const weekStartsOnDayIndex =
    calendarStartDay === CalendarStartDay.SYSTEM
      ? CalendarStartDay[detectCalendarStartDay()]
      : calendarStartDay;
  const range = getRecordCalendarDaysRange({
    selectedDate,
    calendarLayout,
    weekStartsOnDayIndex,
  });

  return {
    ...range,
    weekDayLabels: range.days[0].map((day) =>
      format(
        turnPlainDateToShiftedDateInSystemTimeZone(day),
        doNotTranslate('EEE'),
        {
          locale: dateLocale.localeCatalog,
        },
      ),
    ),
  };
};
