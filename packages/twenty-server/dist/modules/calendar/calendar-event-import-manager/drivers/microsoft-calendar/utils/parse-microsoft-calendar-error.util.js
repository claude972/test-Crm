"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMicrosoftCalendarError = void 0;
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const microsoft_permanent_account_error_codes_constant_1 = require("src/modules/connected-account/constants/microsoft-permanent-account-error-codes.constant");
const utils_1 = require("kovaa-lab-shared/utils");
const parseMicrosoftCalendarError = (error) => {
    const { statusCode, code, message } = error;
    if ((0, utils_1.isDefined)(code) &&
        microsoft_permanent_account_error_codes_constant_1.MICROSOFT_PERMANENT_ACCOUNT_ERROR_CODES.includes(code)) {
        return new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(`Disabled, deleted, unlicensed or inaccessible Microsoft account - code:${code}`, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS, { cause: error });
    }
    if (statusCode === 400 && (0, utils_1.isDefined)(message)) {
        return new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(message, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.UNKNOWN, { cause: error });
    }
    if (statusCode === 404) {
        return new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(message, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.NOT_FOUND, { cause: error });
    }
    if (statusCode === 410) {
        return new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(message, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.SYNC_CURSOR_ERROR, { cause: error });
    }
    return new calendar_event_import_driver_exception_1.CalendarEventImportDriverException(`Microsoft Graph API ${code} ${statusCode} error: ${message}`, calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.TEMPORARY_ERROR, { cause: error });
};
exports.parseMicrosoftCalendarError = parseMicrosoftCalendarError;
