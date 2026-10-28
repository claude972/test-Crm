import { isNonEmptyString } from '@sniptt/guards';
import { type OrderBy } from 'kovaa-lab-shared/types';

const ORDER_DIRECTIONS = new Set([
  'AscNullsFirst',
  'AscNullsLast',
  'DescNullsFirst',
  'DescNullsLast',
]);

export const isOrderByDirection = (value: unknown): value is OrderBy =>
  isNonEmptyString(value) && ORDER_DIRECTIONS.has(value);
