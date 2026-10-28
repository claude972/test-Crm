"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingSlotWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class BookingSlotWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    availabilityId;
    startsAt;
    endsAt;
    status;
    bookedByPersonId;
    calendarEventId;
    workspaceId;
    constructor(data) {
        super(data);
        Object.assign(this, data);
    }
}
exports.BookingSlotWorkspaceEntity = BookingSlotWorkspaceEntity;
