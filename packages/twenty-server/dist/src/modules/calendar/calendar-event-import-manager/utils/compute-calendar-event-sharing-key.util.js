"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCalendarEventSharingKey = computeCalendarEventSharingKey;
function computeCalendarEventSharingKey(eventId) {
    return `key-${eventId}`;
}
