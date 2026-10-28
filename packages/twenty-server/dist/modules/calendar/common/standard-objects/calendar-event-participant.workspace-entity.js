"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventParticipantWorkspaceEntity = exports.CalendarEventParticipantResponseStatus = void 0;
const base_workspace_entity_1 = require("src/engine/kovaa-lab-orm/base.workspace-entity");
var CalendarEventParticipantResponseStatus;
(function (CalendarEventParticipantResponseStatus) {
    CalendarEventParticipantResponseStatus["NEEDS_ACTION"] = "NEEDS_ACTION";
    CalendarEventParticipantResponseStatus["DECLINED"] = "DECLINED";
    CalendarEventParticipantResponseStatus["TENTATIVE"] = "TENTATIVE";
    CalendarEventParticipantResponseStatus["ACCEPTED"] = "ACCEPTED";
})(CalendarEventParticipantResponseStatus || (exports.CalendarEventParticipantResponseStatus = CalendarEventParticipantResponseStatus = {}));
class CalendarEventParticipantWorkspaceEntity extends base_workspace_entity_1.BaseWorkspaceEntity {
    handle;
    displayName;
    isOrganizer;
    responseStatus;
    calendarEvent;
    calendarEventId;
    person;
    personId;
    workspaceMember;
    workspaceMemberId;
}
exports.CalendarEventParticipantWorkspaceEntity = CalendarEventParticipantWorkspaceEntity;
