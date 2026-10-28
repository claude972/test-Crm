import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getImageIdentifierFieldMetadataItem } from '@/object-metadata/utils/getImageIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { type RecordGqlFields } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const buildIdentifierGqlFields = (
  objectMetadata: Pick<
    EnrichedObjectMetadataItem,
    | 'fields'
    | 'labelIdentifierFieldMetadataId'
    | 'imageIdentifierFieldMetadataId'
    | 'nameSingular'
  >,
): RecordGqlFields => {
  const labelIdentifierField =
    getLabelIdentifierFieldMetadataItem(objectMetadata);
  const imageIdentifierField =
    getImageIdentifierFieldMetadataItem(objectMetadata);

  return {
    id: true,
    ...(isDefined(labelIdentifierField) && {
      [labelIdentifierField.name]: true,
    }),
    ...(isDefined(imageIdentifierField) && {
      [imageIdentifierField.name]: true,
    }),
  };
};
