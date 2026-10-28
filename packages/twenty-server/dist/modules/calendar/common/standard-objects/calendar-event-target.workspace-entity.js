"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventTargetWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class CalendarEventTargetWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    calendarEvent;
    calendarEventId;
    isAutomaticallyAssigned;
    isManuallyAssigned;
    targetPerson;
    targetPersonId;
    targetCompany;
    targetCompanyId;
    targetOpportunity;
    targetOpportunityId;
}
exports.CalendarEventTargetWorkspaceEntity = CalendarEventTargetWorkspaceEntity;
