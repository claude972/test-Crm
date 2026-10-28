import { type ObjectRecord as SharedObjectRecord } from 'kovaa-lab-shared/types';

export type BaseObjectRecord = SharedObjectRecord & {
  __typename: string;
};
