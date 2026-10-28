import { type RecordGqlFields } from 'kovaa-lab-shared/types';
import { isDefined } from 'kovaa-lab-shared/utils';

export const isRecordGqlFieldsNode = (
  recordGql: RecordGqlFields | boolean | undefined,
): recordGql is RecordGqlFields =>
  isDefined(recordGql) &&
  typeof recordGql === 'object' &&
  recordGql !== null &&
  !Array.isArray(recordGql);
