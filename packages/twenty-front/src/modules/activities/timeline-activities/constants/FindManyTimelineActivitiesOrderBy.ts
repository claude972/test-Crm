import { type RecordGqlOperationOrderBy } from 'kovaa-lab-shared/types';

export const FIND_MANY_TIMELINE_ACTIVITIES_ORDER_BY: RecordGqlOperationOrderBy =
  [
    {
      createdAt: 'DescNullsFirst',
    },
  ];
