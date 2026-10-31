import { isNonEmptyString } from '@sniptt/guards';
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

  // sourceLabel, never shippedLabel.message: a production build strips the
  // descriptor down to its id, which would make this comparison always fail and
  // leave every stage in its stored wording.
  if (!isDefined(shippedOption) || shippedOption.sourceLabel !== option.label) {
    return option.label;
  }

  // Most locales have no entry for these ids yet, and a production descriptor is
  // id-only, so i18n._() would hand back the hash itself. The active catalog is
  // asked directly rather than inferred from what it returns; with no entry the
  // honest answer is the shipped English, never another locale's wording.
  const messageId = shippedOption.shippedLabel.id;

  if (!isDefined(messageId) || !isDefined(i18n.messages[messageId])) {
    return shippedOption.sourceLabel;
  }

  // An entry can be present and still unusable: lingui hands back the id for an
  // empty string and an empty string for an empty array, both of which a stray
  // untranslated msgstr produces. Checked after resolution because the compiled
  // shape is lingui's business, not ours.
  const translated = i18n._(shippedOption.shippedLabel);

  return isNonEmptyString(translated) && translated !== messageId
    ? translated
    : shippedOption.sourceLabel;
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
