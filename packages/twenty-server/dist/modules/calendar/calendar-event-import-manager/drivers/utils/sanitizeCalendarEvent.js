"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCalendarEvent = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
// oxlint-disable-next-line typescript/no-explicit-any
const sanitizeCalendarEvent = (event, propertiesToSanitize) => {
    const sanitizedEvent = { ...event };
    for (const property of propertiesToSanitize) {
        if (!(0, utils_1.isDefined)(sanitizedEvent[property])) {
            continue;
        }
        if (typeof sanitizedEvent[property] !== 'string') {
            continue;
        }
        sanitizedEvent[property] = sanitizeString(sanitizedEvent[property]);
    }
    return sanitizedEvent;
};
exports.sanitizeCalendarEvent = sanitizeCalendarEvent;
const sanitizeString = (value) => {
    return value.replace('\u0000', '').replace('\x00', '').replace('\x7f', '');
};
