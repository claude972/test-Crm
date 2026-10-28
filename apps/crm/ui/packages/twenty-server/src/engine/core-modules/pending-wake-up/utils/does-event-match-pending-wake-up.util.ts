import { isNonEmptyString } from '@sniptt/guards';
import { type ObjectRecordEvent } from 'kovaa-lab-shared/database-events';
import { type PendingWakeUpCondition } from 'kovaa-lab-shared/pending-wake-up';
import { isNonEmptyArray } from 'kovaa-lab-shared/utils';

export const doesEventMatchPendingWakeUp = ({
  condition,
  event,
}: {
  condition: PendingWakeUpCondition;
  event: ObjectRecordEvent;
}): boolean => {
  if (condition.type !== 'EVENT') {
    return false;
  }

  if (
    isNonEmptyString(condition.recordId) &&
    condition.recordId !== event.recordId
  ) {
    return false;
  }

  if (!isNonEmptyArray(condition.updatedFields)) {
    return true;
  }

  // like database event triggers, a field filter only matches events that report which fields changed
  const eventUpdatedFields =
    'updatedFields' in event.properties
      ? (event.properties.updatedFields ?? [])
      : [];

  return condition.updatedFields.some((field) =>
    eventUpdatedFields.includes(field),
  );
};
