import { type ObjectRecordBaseEvent } from 'kovaa-lab-shared/database-events';
import { type TimelineActivityTypeSnapshot } from 'kovaa-lab-shared/timeline';

export type TimelineActivityPayload = {
  happensAt: Date;
  properties: ObjectRecordBaseEvent['properties'];
  linkedObjectMetadataId?: string;
  linkedRecordId?: string;
  linkedRecordCachedName?: string;
  workspaceMemberId?: string;
  timelineActivityTypeId: string;
  timelineActivityTypeSnapshot: TimelineActivityTypeSnapshot;
  recordId: string;
  objectSingularName?: string;
};
