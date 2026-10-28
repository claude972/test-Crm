import { type MessageDescriptor } from '@lingui/core';
import { CustomException } from 'src/utils/custom-exception';
export declare enum CalendarEventImportExceptionCode {
    PROVIDER_NOT_SUPPORTED = "PROVIDER_NOT_SUPPORTED",
    UNKNOWN = "UNKNOWN"
}
export declare class CalendarEventImportException extends CustomException<CalendarEventImportExceptionCode> {
    constructor(message: string, code: CalendarEventImportExceptionCode, { userFriendlyMessage }?: {
        userFriendlyMessage?: MessageDescriptor;
    });
}
