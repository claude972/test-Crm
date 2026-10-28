import { type ObjectRecordGroupByDateGranularity } from 'kovaa-lab-shared/types';

export type GroupByDefinition = {
  columnNameWithQuotes: string;
  expression: string;
  alias: string;
  dateGranularity?: ObjectRecordGroupByDateGranularity;
};
