import { type ActorMetadata } from 'kovaa-lab-shared/types';

import { type RecordCrudExecutionContext } from './record-crud-execution-context.type';

export type UpdateRecordExecutionContext = RecordCrudExecutionContext & {
  updatedBy?: ActorMetadata;
};
