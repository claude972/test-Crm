import { type MessageDescriptor } from '@lingui/core';
import { CustomException } from 'src/utils/custom-exception';
export declare enum CalendarEventCreationExceptionCode {
    PROVIDER_NOT_SUPPORTED = "PROVIDER_NOT_SUPPORTED",
    PROVIDER_REQUEST_FAILED = "PROVIDER_REQUEST_FAILED"
}
export declare class CalendarEventCreationException extends CustomException<CalendarEventCreationExceptionCode> {
    constructor(message: string, code: CalendarEventCreationExceptionCode, { userFriendlyMessage }?: {
        userFriendlyMessage?: MessageDescriptor;
    });
}
