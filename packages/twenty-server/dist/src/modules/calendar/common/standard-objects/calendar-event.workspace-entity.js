"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventWorkspaceEntity = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
class CalendarEventWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    title;
    isCanceled;
    isFullDay;
    startsAt;
    endsAt;
    externalCreatedAt;
    externalUpdatedAt;
    description;
    location;
    iCalUid;
    conferenceSolution;
    conferenceLink;
    calendarChannelEventAssociations;
    calendarEventParticipants;
    calendarEventTargets;
}
exports.CalendarEventWorkspaceEntity = CalendarEventWorkspaceEntity;
