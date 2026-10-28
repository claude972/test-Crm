import { isDefined } from 'kovaa-lab-shared/utils';
import { type Nullable } from 'kovaa-lab-shared/types';

// TODO: we should create a custom oxlint rule that enforces the use of this function
// instead of using the `===` operator where a and b are | undefined | null
export const compareStrictlyExceptForNullAndUndefined = <A, B>(
  valueA: Nullable<A>,
  valueB: Nullable<B>,
) => {
  if (!isDefined(valueA) && !isDefined(valueB)) {
    return true;
  }

  return valueA === valueB;
};
