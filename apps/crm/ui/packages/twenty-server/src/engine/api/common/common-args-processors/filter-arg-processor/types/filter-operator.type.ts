import { type FieldReferenceFilterOperator } from 'kovaa-lab-shared/types';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'is'
  | 'like'
  | 'ilike'
  | 'startsWith'
  | 'endsWith'
  | 'containsAny'
  | 'containsIlike'
  | 'isEmptyArray'
  | 'search'
  | FieldReferenceFilterOperator;
