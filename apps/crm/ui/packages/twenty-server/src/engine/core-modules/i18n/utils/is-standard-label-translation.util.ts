import { isNonEmptyString } from '@sniptt/guards';

import {
  createI18nInstanceFactory,
  generateMessageId,
  METADATA_LABEL_PLACEHOLDER_PASS_THROUGH,
} from 'kovaa-lab-shared/i18n';
import { type APP_LOCALES } from 'kovaa-lab-shared/translations';

import { ALL_LOCALE_MESSAGES } from 'src/engine/core-modules/i18n/constants/all-locale-messages.constant';

const getI18nInstance = createI18nInstanceFactory(ALL_LOCALE_MESSAGES);

const APP_LOCALE_NAMES = Object.keys(
  ALL_LOCALE_MESSAGES,
) as (keyof typeof APP_LOCALES)[];

// A client that was served a translated label echoes it back on the next write,
// which would store it as a rename. No locale is trusted from the payload, so a
// candidate counts as an echo when it matches the shipped translation of the
// stored value in any locale -- an unrecognised string is always a real rename.
export const isStandardLabelTranslation = ({
  sourceValue,
  candidate,
  context,
}: {
  sourceValue: string;
  candidate: string;
  context: string;
}): boolean => {
  if (!isNonEmptyString(sourceValue) || !isNonEmptyString(candidate)) {
    return false;
  }

  if (candidate === sourceValue) {
    return true;
  }

  const messageId = generateMessageId(sourceValue, context);

  return APP_LOCALE_NAMES.some((locale) => {
    const translated = getI18nInstance(locale)._(
      messageId,
      METADATA_LABEL_PLACEHOLDER_PASS_THROUGH,
    );

    return translated === candidate;
  });
};
