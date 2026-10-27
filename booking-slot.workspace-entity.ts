import { BaseWorkspaceEntity, WorkspaceRelatedEntity } from './base';

export class BookingSlotWorkspaceEntity extends BaseWorkspaceEntity {
  availabilityId: string;
  startsAt: string;
  endsAt: string;
  status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
  bookedByPersonId: string;
  calendarEventId: string;
  workspaceId: string;

  constructor(data: Partial<BookingSlotWorkspaceEntity>) {
    super(data);
    Object.assign(this, data);
  }
}