"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingSlotEntity = void 0;
class BookingSlotEntity {
    availabilityId;
    startsAt;
    endsAt;
    status;
    bookedByPersonId;
    calendarEventId;
    workspaceId;
    constructor(data) {
        Object.assign(this, data);
    }
}
exports.BookingSlotEntity = BookingSlotEntity;
