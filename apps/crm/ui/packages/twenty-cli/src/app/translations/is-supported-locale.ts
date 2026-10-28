import { APP_LOCALES, type AppLocale } from 'kovaa-lab-shared/translations';

export const isSupportedLocale = (locale: string): locale is AppLocale =>
  Object.prototype.hasOwnProperty.call(APP_LOCALES, locale);
