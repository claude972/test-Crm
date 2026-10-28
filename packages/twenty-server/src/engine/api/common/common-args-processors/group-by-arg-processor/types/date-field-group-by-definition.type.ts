import {
  type FirstDayOfTheWeek,
  type ObjectRecordGroupByDateGranularity,
} from 'kovaa-lab-shared/types';

export type DateFieldGroupByDefinition = {
  granularity: ObjectRecordGroupByDateGranularity;
  weekStartDay?: FirstDayOfTheWeek;
  timeZone?: string;
};
