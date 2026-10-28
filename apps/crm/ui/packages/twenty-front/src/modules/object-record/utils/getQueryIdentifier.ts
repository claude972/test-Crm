import { type RecordGqlOperationVariables } from 'kovaa-lab-shared/types';

export const getQueryIdentifier = ({
  objectNameSingular,
  filter,
  orderBy,
  limit,
  cursorFilter,
  groupBy,
}: RecordGqlOperationVariables & {
  objectNameSingular: string;
  groupBy?: Record<string, any>[];
}) =>
  objectNameSingular +
  JSON.stringify(filter) +
  JSON.stringify(orderBy) +
  limit +
  (cursorFilter ? JSON.stringify(cursorFilter) : undefined) +
  (groupBy ? JSON.stringify(groupBy) : '');
