export declare class BookingSlotEntity {
    availabilityId: string;
    startsAt: string;
    endsAt: string;
    status: 'AVAILABLE' | 'BOOKED' | 'CANCELLED';
    bookedByPersonId: string;
    calendarEventId: string;
    workspaceId: string;
    constructor(data: Partial<BookingSlotEntity>);
}
