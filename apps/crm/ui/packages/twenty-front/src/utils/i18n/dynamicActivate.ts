import { i18n } from '@lingui/core';
import {
  APP_LOCALES,
  getLocaleTextDirection,
  SOURCE_LOCALE,
} from 'kovaa-lab-shared/translations';

export const dynamicActivate = async (locale: keyof typeof APP_LOCALES) => {
  if (!Object.values(APP_LOCALES).includes(locale)) {
    // oxlint-disable-next-line no-console
    console.warn(`Invalid locale "${locale}", defaulting to "en"`);
    locale = SOURCE_LOCALE;
  }
  const [{ messages: sourceMessages }, { messages }] = await Promise.all([
    import(`../../locales/generated/${SOURCE_LOCALE}.ts`),
    import(`../../locales/generated/${locale}.ts`),
  ]);
  i18n.load(locale, { ...sourceMessages, ...messages });
  i18n.activate(locale);

  document.documentElement.lang = locale;
  document.documentElement.dir = getLocaleTextDirection(locale);
};
