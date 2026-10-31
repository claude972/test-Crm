import { getMetadataLabelContext } from 'kovaa-lab-shared/i18n';
import { isDefined } from 'kovaa-lab-shared/utils';

import { translateStandardLabel } from 'src/engine/core-modules/i18n/utils/translate-standard-label.util';
import { type EffectiveEntityI18nContext } from 'src/engine/metadata-modules/overrides/types/effective-entity-i18n-context.type';

const OPTION_LABEL_CONTEXT = getMetadataLabelContext('fieldMetadata', 'label');

const hasStringLabel = (value: unknown): value is { label: string } =>
  isDefined(value) &&
  typeof value === 'object' &&
  'label' in value &&
  typeof (value as { label: unknown }).label === 'string';

// Options are a jsonb array, so they are not reachable through the scalar
// property registry the rest of the resolver walks. Only the label is resolved:
// the api value, the id, the position and the color are carried through as read.
// A label the catalog does not know -- a renamed stage -- is returned unchanged.
// Restricted to the standard app, the only owner that ships option labels: a
// custom field's labels were typed by the operator, and the write guard is gated
// the same way, so the two sides cannot disagree on what was ever shipped.
export const resolveEffectiveTranslatedOptions = (
  options: unknown,
  i18nContext: EffectiveEntityI18nContext,
): unknown => {
  if (!Array.isArray(options) || !i18nContext.isStandardApp) {
    return options;
  }

  const { i18nInstance, applicationCatalog } = i18nContext;

  return options.map((option: unknown) =>
    hasStringLabel(option)
      ? {
          ...option,
          label: translateStandardLabel({
            sourceValue: option.label,
            context: OPTION_LABEL_CONTEXT,
            applicationCatalog,
            i18nInstance,
          }),
        }
      : option,
  );
};
