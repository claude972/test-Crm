import { i18n } from '@lingui/core';
import { isDefined } from 'kovaa-lab-shared/utils';

import { STANDARD_SELECT_OPTION_LABELS } from '@/object-metadata/constants/StandardSelectOptionLabels';

// Display only -- never write the result back, and never let it reach a filter
// value, a sort key, a mutation variable or the data-model form: the canonical
// options array stays the one the API was served.
// Two facts decide it, rather than one guess: the option must be a standard one
// by id, and its stored label must still be the shipped English source. A
// renamed stage fails the second, so an operator's wording is returned verbatim.
export const translateStandardSelectOptionLabel = ({
  fieldUniversalIdentifier,
  option,
}: {
  fieldUniversalIdentifier?: string | null;
  option: { id?: string | null; label: string };
}): string => {
  if (!isDefined(fieldUniversalIdentifier) || !isDefined(option.id)) {
    return option.label;
  }

  const shippedOptions =
    STANDARD_SELECT_OPTION_LABELS[fieldUniversalIdentifier];

  if (!isDefined(shippedOptions)) {
    return option.label;
  }

  const shippedOption = shippedOptions.find(
    ({ optionId }) => optionId === option.id,
  );

  if (
    !isDefined(shippedOption) ||
    shippedOption.shippedLabel.message !== option.label
  ) {
    return option.label;
  }

  return i18n._(shippedOption.shippedLabel);
};

// Same rule over a whole options array, for the render-side layers that hand the
// array on to a renderer. The array identity is preserved when nothing changes,
// so a translated locale is the only case that allocates.
export const translateStandardSelectOptionLabels = <
  TOption extends { id?: string | null; label: string },
>({
  fieldUniversalIdentifier,
  options,
}: {
  fieldUniversalIdentifier?: string | null;
  options?: readonly TOption[] | null;
}): TOption[] | null | undefined => {
  if (!isDefined(options)) {
    return options;
  }

  let hasTranslation = false;

  const translatedOptions = options.map((option) => {
    const label = translateStandardSelectOptionLabel({
      fieldUniversalIdentifier,
      option,
    });

    if (label === option.label) {
      return option;
    }

    hasTranslation = true;

    return { ...option, label };
  });

  return hasTranslation ? translatedOptions : [...options];
};
