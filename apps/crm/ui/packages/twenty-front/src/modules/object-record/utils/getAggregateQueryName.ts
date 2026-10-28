import { capitalize, isDefined } from 'kovaa-lab-shared/utils';
import { doNotTranslate } from 'kovaa-lab-shared/i18n';
export const getAggregateQueryName = (
  objectMetadataNamePlural: string,
): string => {
  if (!isDefined(objectMetadataNamePlural)) {
    throw new Error(doNotTranslate('objectMetadataNamePlural is required'));
  }
  return doNotTranslate(`Aggregate${capitalize(objectMetadataNamePlural)}`);
};
