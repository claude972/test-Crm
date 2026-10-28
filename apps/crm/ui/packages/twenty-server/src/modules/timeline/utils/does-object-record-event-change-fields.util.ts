import { type ObjectRecordBaseEvent } from 'kovaa-lab-shared/database-events';
import { isDefined } from 'kovaa-lab-shared/utils';

export const doesObjectRecordEventChangeFields = ({
  event,
  fieldNames,
}: {
  event: ObjectRecordBaseEvent;
  fieldNames: string[];
}): boolean => {
  const { updatedFields, diff } = event.properties;

  if (isDefined(updatedFields)) {
    return fieldNames.some((fieldName) => updatedFields.includes(fieldName));
  }

  return (
    isDefined(diff) &&
    fieldNames.some((fieldName) =>
      Object.prototype.hasOwnProperty.call(diff, fieldName),
    )
  );
};
