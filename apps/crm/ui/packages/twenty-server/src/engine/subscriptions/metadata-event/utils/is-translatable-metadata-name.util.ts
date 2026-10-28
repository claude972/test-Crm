import {
  TRANSLATABLE_PROPERTIES_BY_METADATA_NAME,
  type TranslatableMetadataName,
} from 'kovaa-lab-shared/i18n';

export const isTranslatableMetadataName = (
  metadataName: string,
): metadataName is TranslatableMetadataName =>
  Object.prototype.hasOwnProperty.call(
    TRANSLATABLE_PROPERTIES_BY_METADATA_NAME,
    metadataName,
  );
