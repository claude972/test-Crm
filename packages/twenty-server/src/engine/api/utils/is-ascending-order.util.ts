import { OrderByDirection } from 'kovaa-lab-shared/types';

export const isAscendingOrder = (direction: OrderByDirection): boolean =>
  direction === OrderByDirection.AscNullsFirst ||
  direction === OrderByDirection.AscNullsLast;
