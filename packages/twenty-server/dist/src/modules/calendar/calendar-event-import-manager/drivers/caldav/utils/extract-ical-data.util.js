"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractICalData = void 0;
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
// Some CalDAV servers return calendar-data as a string, others nest it under
// _cdata or other shapes. Recurse until a VCALENDAR block is found.
const extractICalData = (calendarData) => {
    if (!(0, utils_1.isDefined)(calendarData))
        return null;
    if ((0, guards_1.isString)(calendarData) && calendarData.includes('VCALENDAR')) {
        return calendarData;
    }
    if (typeof calendarData === 'object') {
        for (const value of Object.values(calendarData)) {
            const result = (0, exports.extractICalData)(value);
            if ((0, utils_1.isDefined)(result))
                return result;
        }
    }
    return null;
};
exports.extractICalData = extractICalData;
