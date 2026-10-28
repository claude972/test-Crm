import { isDefined } from 'kovaa-lab-shared/utils';

import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';

export const isFlatFieldMetadataRequiredOnCreate = (
  flatFieldMetadata: Pick<FlatFieldMetadata, 'isNullable' | 'defaultValue'>,
): boolean =>
  flatFieldMetadata.isNullable === false &&
  !isDefined(flatFieldMetadata.defaultValue);
