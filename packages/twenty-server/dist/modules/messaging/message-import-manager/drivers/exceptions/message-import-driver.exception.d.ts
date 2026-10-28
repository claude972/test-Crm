export declare enum MessageImportDriverExceptionCode {
    IMAP_AUTH_FAILED = "IMAP_AUTH_FAILED",
    IMAP_CONNECTION_FAILED = "IMAP_CONNECTION_FAILED",
    MICROSOFT_AUTH_FAILED = "MICROSOFT_AUTH_FAILED",
    INBOX_PARSE_ERROR = "INBOX_PARSE_ERROR"
}
export declare class MessageImportDriverException extends Error {
    code: MessageImportDriverExceptionCode;
    constructor(code: MessageImportDriverExceptionCode, message?: string);
}
