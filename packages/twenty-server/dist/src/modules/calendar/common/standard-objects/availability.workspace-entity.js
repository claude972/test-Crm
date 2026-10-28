"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class AvailabilityWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    type;
    dayOfWeek;
    startTime;
    endTime;
    date;
    memberId;
    workspaceId;
    constructor(data) {
        super(data);
        Object.assign(this, data);
    }
}
exports.AvailabilityWorkspaceEntity = AvailabilityWorkspaceEntity;
