import { TimeFormat } from '@/localization/constants/TimeFormat';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const getTimeMask = (timeFormat: TimeFormat): string => {
  return doNotTranslate(
    timeFormat === TimeFormat.HOUR_12 ? 'HH`:mm` `aa' : 'HH`:mm`',
  );
};
