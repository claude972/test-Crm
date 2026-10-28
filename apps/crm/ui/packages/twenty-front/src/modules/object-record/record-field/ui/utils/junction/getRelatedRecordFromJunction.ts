import { isObjectWithId } from '@/object-record/record-field/ui/utils/junction/isObjectWithId';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { safeGetNestedProperty } from 'kovaa-lab-shared/utils';

export const getRelatedRecordFromJunction = ({
  junctionRecord,
  relationFieldName,
}: {
  junctionRecord: object;
  relationFieldName: string;
}): ObjectRecord | undefined => {
  const relatedRecord = safeGetNestedProperty(
    junctionRecord,
    relationFieldName,
  );

  return isObjectWithId(relatedRecord) ? relatedRecord : undefined;
};
