"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasCalendarEventChanged = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
const TEXT_FIELD_NAMES = [
    'iCalUid',
    'title',
    'description',
    'location',
    'conferenceSolution',
];
const DATE_TIME_FIELD_NAMES = ['startsAt', 'endsAt'];
const BOOLEAN_FIELD_NAMES = ['isFullDay', 'isCanceled'];
const toEpochMilliseconds = (value) => {
    if (value instanceof Date) {
        return value.getTime();
    }
    if (!(0, guards_1.isNonEmptyString)(value)) {
        return null;
    }
    try {
        return (0, utils_1.parseToInstantOrThrow)(value).epochMilliseconds;
    }
    catch {
        return Number.NaN;
    }
};
const hasCalendarEventChanged = ({ existingCalendarEvent, calendarEvent, }) => TEXT_FIELD_NAMES.some((fieldName) => (existingCalendarEvent[fieldName] ?? '') !==
    (calendarEvent[fieldName] ?? '')) ||
    DATE_TIME_FIELD_NAMES.some((fieldName) => toEpochMilliseconds(existingCalendarEvent[fieldName]) !==
        toEpochMilliseconds(calendarEvent[fieldName])) ||
    BOOLEAN_FIELD_NAMES.some((fieldName) => existingCalendarEvent[fieldName] !== calendarEvent[fieldName]) ||
    (existingCalendarEvent.conferenceLink?.primaryLinkLabel ?? '') !==
        (calendarEvent.conferenceLink.primaryLinkLabel ?? '') ||
    (existingCalendarEvent.conferenceLink?.primaryLinkUrl ?? '') !==
        (calendarEvent.conferenceLink.primaryLinkUrl ?? '') ||
    (0, utils_1.isNonEmptyArray)(existingCalendarEvent.conferenceLink?.secondaryLinks);
exports.hasCalendarEventChanged = hasCalendarEventChanged;
