"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventCreationException = exports.CalendarEventCreationExceptionCode = void 0;
const macro_1 = require("@lingui/core/macro");
const utils_1 = require("kovaa-lab-shared/utils");
const custom_exception_1 = require("src/utils/custom-exception");
var CalendarEventCreationExceptionCode;
(function (CalendarEventCreationExceptionCode) {
    CalendarEventCreationExceptionCode["PROVIDER_NOT_SUPPORTED"] = "PROVIDER_NOT_SUPPORTED";
    CalendarEventCreationExceptionCode["PROVIDER_REQUEST_FAILED"] = "PROVIDER_REQUEST_FAILED";
})(CalendarEventCreationExceptionCode || (exports.CalendarEventCreationExceptionCode = CalendarEventCreationExceptionCode = {}));
const getCalendarEventCreationExceptionUserFriendlyMessage = (code) => {
    switch (code) {
        case CalendarEventCreationExceptionCode.PROVIDER_NOT_SUPPORTED:
            return (0, macro_1.msg) `Calendar event creation is not supported for this account.`;
        case CalendarEventCreationExceptionCode.PROVIDER_REQUEST_FAILED:
            return (0, macro_1.msg) `The calendar provider rejected the event creation request.`;
        default:
            (0, utils_1.assertUnreachable)(code);
    }
};
class CalendarEventCreationException extends custom_exception_1.CustomException {
    constructor(message, code, { userFriendlyMessage } = {}) {
        super(message, code, {
            userFriendlyMessage: userFriendlyMessage ??
                getCalendarEventCreationExceptionUserFriendlyMessage(code),
        });
    }
}
exports.CalendarEventCreationException = CalendarEventCreationException;
