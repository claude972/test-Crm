import { type ObjectRecord } from 'kovaa-lab-shared/types';

export type CommonFindDuplicatesOutputItem = {
  records: ObjectRecord[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};
