"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventImportException = exports.CalendarEventImportExceptionCode = void 0;
const macro_1 = require("@lingui/core/macro");
const utils_1 = require("kovaa-lab-shared/utils");
const custom_exception_1 = require("src/utils/custom-exception");
var CalendarEventImportExceptionCode;
(function (CalendarEventImportExceptionCode) {
    CalendarEventImportExceptionCode["PROVIDER_NOT_SUPPORTED"] = "PROVIDER_NOT_SUPPORTED";
    CalendarEventImportExceptionCode["UNKNOWN"] = "UNKNOWN";
})(CalendarEventImportExceptionCode || (exports.CalendarEventImportExceptionCode = CalendarEventImportExceptionCode = {}));
const getCalendarEventImportExceptionUserFriendlyMessage = (code) => {
    switch (code) {
        case CalendarEventImportExceptionCode.PROVIDER_NOT_SUPPORTED:
            return (0, macro_1.msg) `Calendar provider is not supported.`;
        case CalendarEventImportExceptionCode.UNKNOWN:
            return (0, macro_1.msg) `An unknown calendar error occurred.`;
        default:
            (0, utils_1.assertUnreachable)(code);
    }
};
class CalendarEventImportException extends custom_exception_1.CustomException {
    constructor(message, code, { userFriendlyMessage } = {}) {
        super(message, code, {
            userFriendlyMessage: userFriendlyMessage ??
                getCalendarEventImportExceptionUserFriendlyMessage(code),
        });
    }
}
exports.CalendarEventImportException = CalendarEventImportException;
