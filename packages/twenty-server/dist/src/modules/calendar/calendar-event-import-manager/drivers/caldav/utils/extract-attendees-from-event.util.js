"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractAttendeesFromEvent = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const map_partstat_to_response_status_util_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/utils/map-partstat-to-response-status.util");
const extractAttendeesFromEvent = (event) => {
    if (!(0, utils_1.isDefined)(event.attendee))
        return [];
    const attendees = Array.isArray(event.attendee)
        ? event.attendee
        : [event.attendee];
    return attendees.map((attendee) => {
        const rawValue = (0, guards_1.isString)(attendee) ? attendee : attendee.val;
        const params = (0, guards_1.isString)(attendee) ? undefined : attendee.params;
        const handle = rawValue.replace(/^mailto:/i, '').toLowerCase();
        const partStat = params?.PARTSTAT ?? 'NEEDS_ACTION';
        return {
            displayName: params?.CN || handle || 'Unknown',
            responseStatus: (0, map_partstat_to_response_status_util_1.mapPartStatToResponseStatus)(partStat),
            handle,
            isOrganizer: false,
        };
    });
};
exports.extractAttendeesFromEvent = extractAttendeesFromEvent;
