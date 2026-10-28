"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityEntity = void 0;
class AvailabilityEntity {
    type;
    dayOfWeek;
    startTime;
    endTime;
    date;
    memberId;
    workspaceId;
    constructor(data) {
        Object.assign(this, data);
    }
}
exports.AvailabilityEntity = AvailabilityEntity;
