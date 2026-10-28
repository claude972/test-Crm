import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getImageIdentifierFieldMetadataItem } from '@/object-metadata/utils/getImageIdentifierFieldMetadataItem';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { type ObjectRecordIdentifier } from '@/object-record/types/ObjectRecordIdentifier';

import { getAvatarShape } from './getAvatarShape';
import { getAvatarUrl } from './getAvatarUrl';
import { getLabelIdentifierFieldValue } from './getLabelIdentifierFieldValue';
import { getLinkToShowPage } from './getLinkToShowPage';

export const getObjectRecordIdentifier = ({
  objectMetadataItem,
  record,
  allowRequestsToKovaaLab CRMIcons,
}: {
  objectMetadataItem: Pick<
    EnrichedObjectMetadataItem,
    | 'fields'
    | 'labelIdentifierFieldMetadataId'
    | 'nameSingular'
    | 'imageIdentifierFieldMetadataId'
  >;
  record: ObjectRecord;
  allowRequestsToKovaaLab CRMIcons: boolean;
}): ObjectRecordIdentifier => {
  const labelIdentifierFieldMetadataItem =
    getLabelIdentifierFieldMetadataItem(objectMetadataItem);

  const labelIdentifierFieldValue = getLabelIdentifierFieldValue(
    record,
    labelIdentifierFieldMetadataItem,
  );

  const imageIdentifierFieldMetadata =
    getImageIdentifierFieldMetadataItem(objectMetadataItem);

  const avatarShape = getAvatarShape(objectMetadataItem);

  const avatarUrl = getAvatarUrl(
    objectMetadataItem.nameSingular,
    record,
    imageIdentifierFieldMetadata,
    allowRequestsToKovaaLab CRMIcons,
  );

  const linkToShowPage = getLinkToShowPage(
    objectMetadataItem.nameSingular,
    record,
  );

  return {
    id: record.id,
    name: `${labelIdentifierFieldValue}`,
    avatarUrl,
    avatarShape,
    linkToShowPage,
  };
};
