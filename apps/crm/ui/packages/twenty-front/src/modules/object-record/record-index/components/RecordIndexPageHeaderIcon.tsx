import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isDefined } from 'kovaa-lab-shared/utils';

export const RecordIndexPageHeaderIcon = ({
  objectMetadataItem,
}: {
  objectMetadataItem?: EnrichedObjectMetadataItem;
}) => {
  if (!isDefined(objectMetadataItem)) {
    return null;
  }

  return <ObjectMetadataIcon objectMetadataItem={objectMetadataItem} />;
};
