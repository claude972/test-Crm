import { type MessageDescriptor } from '@lingui/core';
import { CustomException } from 'src/utils/custom-exception';
export declare enum CalendarEventImportDriverExceptionCode {
    NOT_FOUND = "NOT_FOUND",
    TEMPORARY_ERROR = "TEMPORARY_ERROR",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    SYNC_CURSOR_ERROR = "SYNC_CURSOR_ERROR",
    UNKNOWN = "UNKNOWN",
    UNKNOWN_NETWORK_ERROR = "UNKNOWN_NETWORK_ERROR",
    HANDLE_ALIASES_REQUIRED = "HANDLE_ALIASES_REQUIRED",
    CHANNEL_MISCONFIGURED = "CHANNEL_MISCONFIGURED"
}
export declare class CalendarEventImportDriverException extends CustomException<CalendarEventImportDriverExceptionCode> {
    cause?: unknown;
    constructor(message: string, code: CalendarEventImportDriverExceptionCode, { userFriendlyMessage, cause, }?: {
        userFriendlyMessage?: MessageDescriptor;
        cause?: unknown;
    });
}
