"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractOrganizerFromEvent = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const calendar_event_participant_workspace_entity_1 = require("src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity");
const extractOrganizerFromEvent = (event) => {
    const organizer = event.organizer;
    if (!(0, utils_1.isDefined)(organizer))
        return null;
    const rawValue = (0, guards_1.isString)(organizer) ? organizer : organizer.val;
    const commonName = (0, guards_1.isString)(organizer) ? undefined : organizer.params?.CN;
    const handle = rawValue.replace(/^mailto:/i, '').toLowerCase();
    return {
        displayName: commonName || handle || 'Unknown',
        responseStatus: calendar_event_participant_workspace_entity_1.CalendarEventParticipantResponseStatus.ACCEPTED,
        handle,
        isOrganizer: true,
    };
};
exports.extractOrganizerFromEvent = extractOrganizerFromEvent;
