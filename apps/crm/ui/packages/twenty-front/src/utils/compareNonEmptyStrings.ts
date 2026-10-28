import { isNonEmptyString } from '@sniptt/guards';
import { type Nullable } from 'kovaa-lab-shared/types';

export const compareNonEmptyStrings = (
  valueA: Nullable<string>,
  valueB: Nullable<string>,
) => {
  if (!isNonEmptyString(valueA) && !isNonEmptyString(valueB)) {
    return true;
  }

  return valueA === valueB;
};
