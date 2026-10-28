import { doNotTranslate } from 'kovaa-lab-shared/i18n';

export const detectTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return doNotTranslate('UTC');
  }
};
