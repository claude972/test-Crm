import { type TranslatableMetadataName } from 'kovaa-lab-shared/i18n';
import { type AllMetadataName } from 'kovaa-lab-shared/metadata';

import { ALL_OVERRIDABLE_PROPERTIES_BY_METADATA_NAME } from 'src/engine/metadata-modules/overrides/constants/all-overridable-properties-by-metadata-name.constant';
import { ALL_TRANSLATABLE_PROPERTIES_BY_METADATA_NAME } from 'src/engine/metadata-modules/flat-entity/constant/all-translatable-properties-by-metadata-name.constant';
import { type EffectiveEntityI18nContext } from 'src/engine/metadata-modules/overrides/types/effective-entity-i18n-context.type';
import { resolveEffectiveEntityPropertyByName } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-entity-property.util';
import { resolveEffectiveTranslatedOptions } from 'src/engine/metadata-modules/overrides/utils/resolve-effective-translated-options.util';
import {
  type OverridableFlatEntity,
  resolveEffectiveFlatEntityProperty,
} from 'src/engine/metadata-modules/overrides/utils/resolve-effective-flat-entity-property.util';

export const resolveEffectiveTranslatedFlatEntity = <
  TFlatEntity extends OverridableFlatEntity & Record<string, unknown>,
>({
  metadataName,
  flatEntity,
  i18nContext,
}: {
  metadataName: AllMetadataName;
  flatEntity: TFlatEntity;
  i18nContext: EffectiveEntityI18nContext;
}): TFlatEntity => {
  const overridableProperties: readonly string[] =
    ALL_OVERRIDABLE_PROPERTIES_BY_METADATA_NAME[metadataName];
  const translatableProperties: readonly string[] =
    ALL_TRANSLATABLE_PROPERTIES_BY_METADATA_NAME[metadataName] ?? [];

  const effectiveFlatEntityWithTranslatedOptions =
    metadataName === 'fieldMetadata'
      ? {
          ...flatEntity,
          ['options']: resolveEffectiveTranslatedOptions(
            flatEntity.options,
            i18nContext,
          ),
        }
      : flatEntity;

  return overridableProperties.reduce<TFlatEntity>(
    (effectiveFlatEntity, property) => ({
      ...effectiveFlatEntity,
      [property]: translatableProperties.includes(property)
        ? resolveEffectiveEntityPropertyByName({
            metadataName: metadataName as TranslatableMetadataName,
            baseValue: flatEntity[property],
            overrides: flatEntity.overrides,
            property,
            i18nContext,
          })
        : resolveEffectiveFlatEntityProperty({
            metadataName,
            flatEntity,
            property: property as never,
            authorContext: i18nContext,
          }),
    }),
    effectiveFlatEntityWithTranslatedOptions,
  );
};
