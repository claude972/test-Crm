import { type ObjectRecord } from 'kovaa-lab-shared/types';

export type ObjectRecordOperationUpdateInput = {
  recordId: string;
  updatedFields: Record<string, unknown>[];
  updatedRecord?: ObjectRecord;
};
