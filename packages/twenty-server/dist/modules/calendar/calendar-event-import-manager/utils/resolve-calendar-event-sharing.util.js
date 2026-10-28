"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCalendarEventSharing = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const compute_calendar_event_sharing_key_util_1 = require("src/modules/calendar/calendar-event-import-manager/utils/compute-calendar-event-sharing-key.util");
const resolveCalendarEventSharing = ({ provider, fetchedCalendarEvents, existingEventExternalIds, sharedAssociations, iCalUidByCalendarEventId, isCalendarEventSharingEnabled, }) => {
    const otherChannelIdsByCalendarEventId = new Map();
    const calendarEventIdBySharingKey = new Map();
    for (const association of sharedAssociations) {
        const otherChannelIds = otherChannelIdsByCalendarEventId.get(association.calendarEventId) ?? [];
        if (!otherChannelIds.includes(association.calendarChannelId)) {
            otherChannelIdsByCalendarEventId.set(association.calendarEventId, [
                ...otherChannelIds,
                association.calendarChannelId,
            ]);
        }
        const sharingKey = (0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider,
            eventExternalId: association.eventExternalId,
            iCalUid: iCalUidByCalendarEventId.get(association.calendarEventId) ?? null,
        });
        if ((0, utils_1.isDefined)(sharingKey) && !calendarEventIdBySharingKey.has(sharingKey)) {
            calendarEventIdBySharingKey.set(sharingKey, association.calendarEventId);
        }
    }
    const calendarEventIdToLinkByEventExternalId = new Map();
    if (!isCalendarEventSharingEnabled) {
        return {
            calendarEventIdToLinkByEventExternalId,
            otherChannelIdsByCalendarEventId,
        };
    }
    for (const fetchedCalendarEvent of fetchedCalendarEvents) {
        if (existingEventExternalIds.has(fetchedCalendarEvent.id)) {
            continue;
        }
        const sharingKey = (0, compute_calendar_event_sharing_key_util_1.computeCalendarEventSharingKey)({
            provider,
            eventExternalId: fetchedCalendarEvent.id,
            iCalUid: fetchedCalendarEvent.iCalUid,
        });
        const calendarEventId = (0, utils_1.isDefined)(sharingKey)
            ? calendarEventIdBySharingKey.get(sharingKey)
            : undefined;
        if ((0, utils_1.isDefined)(calendarEventId)) {
            calendarEventIdToLinkByEventExternalId.set(fetchedCalendarEvent.id, calendarEventId);
        }
    }
    return {
        calendarEventIdToLinkByEventExternalId,
        otherChannelIdsByCalendarEventId,
    };
};
exports.resolveCalendarEventSharing = resolveCalendarEventSharing;
