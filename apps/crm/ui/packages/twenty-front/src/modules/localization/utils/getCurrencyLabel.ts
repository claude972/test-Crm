import { CURRENCY_CODE_LABELS } from 'kovaa-lab-shared/constants';
import { SOURCE_LOCALE } from 'kovaa-lab-shared/translations';
import { isDefined } from 'kovaa-lab-shared/utils';

const SOURCE_LOCALE_LABELS: Partial<Record<string, { label: string }>> =
  CURRENCY_CODE_LABELS;

export const getCurrencyLabel = ({
  currencyCode,
  locale,
}: {
  currencyCode: string;
  locale: string;
}): string => {
  const sourceLocaleLabel = SOURCE_LOCALE_LABELS[currencyCode]?.label;

  if (locale === SOURCE_LOCALE && isDefined(sourceLocaleLabel)) {
    return sourceLocaleLabel;
  }

  try {
    return (
      new Intl.DisplayNames([locale], {
        type: 'currency',
        fallback: 'none',
      }).of(currencyCode) ??
      sourceLocaleLabel ??
      currencyCode
    );
  } catch {
    return sourceLocaleLabel ?? currencyCode;
  }
};
