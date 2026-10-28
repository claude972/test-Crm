import { type ObjectRecord } from 'kovaa-lab-shared/types';

export type PartialObjectRecordWithId = Partial<ObjectRecord> & { id: string };
