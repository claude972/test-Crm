"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventImportDriverException = exports.CalendarEventImportDriverExceptionCode = void 0;
const macro_1 = require("@lingui/core/macro");
const utils_1 = require("kovaa-lab-shared/utils");
const custom_exception_1 = require("src/utils/custom-exception");
var CalendarEventImportDriverExceptionCode;
(function (CalendarEventImportDriverExceptionCode) {
    CalendarEventImportDriverExceptionCode["NOT_FOUND"] = "NOT_FOUND";
    CalendarEventImportDriverExceptionCode["TEMPORARY_ERROR"] = "TEMPORARY_ERROR";
    CalendarEventImportDriverExceptionCode["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    CalendarEventImportDriverExceptionCode["SYNC_CURSOR_ERROR"] = "SYNC_CURSOR_ERROR";
    CalendarEventImportDriverExceptionCode["UNKNOWN"] = "UNKNOWN";
    CalendarEventImportDriverExceptionCode["UNKNOWN_NETWORK_ERROR"] = "UNKNOWN_NETWORK_ERROR";
    CalendarEventImportDriverExceptionCode["HANDLE_ALIASES_REQUIRED"] = "HANDLE_ALIASES_REQUIRED";
    CalendarEventImportDriverExceptionCode["CHANNEL_MISCONFIGURED"] = "CHANNEL_MISCONFIGURED";
})(CalendarEventImportDriverExceptionCode || (exports.CalendarEventImportDriverExceptionCode = CalendarEventImportDriverExceptionCode = {}));
const getCalendarEventImportDriverExceptionUserFriendlyMessage = (code) => {
    switch (code) {
        case CalendarEventImportDriverExceptionCode.NOT_FOUND:
            return (0, macro_1.msg) `Calendar event not found.`;
        case CalendarEventImportDriverExceptionCode.TEMPORARY_ERROR:
            return (0, macro_1.msg) `A temporary error occurred. Please try again.`;
        case CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS:
            return (0, macro_1.msg) `Insufficient permissions to access calendar.`;
        case CalendarEventImportDriverExceptionCode.SYNC_CURSOR_ERROR:
            return (0, macro_1.msg) `Calendar sync error.`;
        case CalendarEventImportDriverExceptionCode.UNKNOWN:
            return (0, macro_1.msg) `An unknown calendar error occurred.`;
        case CalendarEventImportDriverExceptionCode.UNKNOWN_NETWORK_ERROR:
            return (0, macro_1.msg) `A network error occurred while accessing calendar.`;
        case CalendarEventImportDriverExceptionCode.HANDLE_ALIASES_REQUIRED:
            return (0, macro_1.msg) `Handle aliases are required.`;
        case CalendarEventImportDriverExceptionCode.CHANNEL_MISCONFIGURED:
            return (0, macro_1.msg) `Calendar channel is misconfigured.`;
        default:
            (0, utils_1.assertUnreachable)(code);
    }
};
class CalendarEventImportDriverException extends custom_exception_1.CustomException {
    cause;
    constructor(message, code, { userFriendlyMessage, cause, } = {}) {
        super(message, code, {
            userFriendlyMessage: userFriendlyMessage ??
                getCalendarEventImportDriverExceptionUserFriendlyMessage(code),
        });
        if ((0, utils_1.isDefined)(cause)) {
            this.cause = cause;
        }
    }
}
exports.CalendarEventImportDriverException = CalendarEventImportDriverException;
