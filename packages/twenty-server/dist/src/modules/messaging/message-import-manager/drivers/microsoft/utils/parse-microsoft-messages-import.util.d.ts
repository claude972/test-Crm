import { MessageImportDriverException } from 'src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception';
export declare const parseMicrosoftMessagesImportError: (error: {
    statusCode: number;
    message?: string;
    code?: string;
}, options?: {
    cause?: Error;
}) => MessageImportDriverException;
