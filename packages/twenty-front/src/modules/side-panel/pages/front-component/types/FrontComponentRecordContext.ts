import { type RecordGqlOperationFilter } from 'kovaa-lab-shared/types';

export type FrontComponentRecordContext = {
  objectNameSingular?: string;
  selectedRecordIds?: string[];
  selectedRecordsFilter?: RecordGqlOperationFilter | null;
};
