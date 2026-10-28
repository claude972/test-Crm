"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarChannelEventAssociationWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class CalendarChannelEventAssociationWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    eventExternalId;
    recurringEventExternalId;
    calendarChannelId;
    calendarEvent;
    calendarEventId;
}
exports.CalendarChannelEventAssociationWorkspaceEntity = CalendarChannelEventAssociationWorkspaceEntity;
