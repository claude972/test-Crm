import { BaseWorkspaceEntity } from 'src/engine/kovaa-lab-orm/base.workspace-entity';
export declare class BookingSlotWorkspaceEntity extends BaseWorkspaceEntity {
    availabilityId: string;
    startsAt: string;
    endsAt: string;
    status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
    bookedByPersonId: string;
    calendarEventId: string;
    workspaceId: string;
    constructor(data: Partial<BookingSlotWorkspaceEntity>);
}
