import { getMetadataLabelContext } from 'kovaa-lab-shared/i18n';
import { isDefined } from 'kovaa-lab-shared/utils';

import { isStandardLabelTranslation } from 'src/engine/core-modules/i18n/utils/is-standard-label-translation.util';

type OptionWithLabel = {
  id?: string;
  value: string;
  label: string;
};

const OPTION_LABEL_CONTEXT = getMetadataLabelContext('fieldMetadata', 'label');

const findStoredOption = <TStored extends OptionWithLabel>(
  storedOptions: readonly TStored[],
  option: OptionWithLabel,
): TStored | undefined =>
  storedOptions.find((storedOption) =>
    isDefined(option.id) && isDefined(storedOption.id)
      ? storedOption.id === option.id
      : storedOption.value === option.value,
  );

// Option labels are read back translated, so a client that saves the array it was
// served would store a translation as a rename -- for every locale at once, with
// nothing recording what the shipped label was. A label the catalogs do not tie to
// the stored one is a real rename and is kept.
export const preserveEchoedOptionLabels = <
  TOption extends OptionWithLabel,
  TStored extends OptionWithLabel,
>({
  storedOptions,
  updatedOptions,
}: {
  storedOptions: readonly TStored[] | null | undefined;
  updatedOptions: readonly TOption[];
}): TOption[] => {
  if (!isDefined(storedOptions)) {
    return [...updatedOptions];
  }

  return updatedOptions.map((option) => {
    const storedOption = findStoredOption(storedOptions, option);

    if (!isDefined(storedOption)) {
      return option;
    }

    return isStandardLabelTranslation({
      sourceValue: storedOption.label,
      candidate: option.label,
      context: OPTION_LABEL_CONTEXT,
    })
      ? { ...option, label: storedOption.label }
      : option;
  });
};
