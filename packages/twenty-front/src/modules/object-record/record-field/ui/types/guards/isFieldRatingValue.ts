import { RATING_VALUES } from 'kovaa-lab-shared/constants';
import { type FieldRatingValue } from 'kovaa-lab-shared/types';

export const isFieldRatingValue = (
  fieldValue: unknown,
): fieldValue is FieldRatingValue =>
  RATING_VALUES.includes(fieldValue as NonNullable<FieldRatingValue>);
