import { type RecordGqlOperationFilter } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const makeAndFilterVariables = (
  filters: (RecordGqlOperationFilter | undefined)[],
): RecordGqlOperationFilter | undefined => {
  const definedFilters = filters.filter(isDefined);

  if (!definedFilters.length) return undefined;

  return definedFilters.length === 1
    ? definedFilters[0]
    : { and: definedFilters };
};
