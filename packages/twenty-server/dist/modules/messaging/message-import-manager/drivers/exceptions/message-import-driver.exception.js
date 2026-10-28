"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageImportDriverException = exports.MessageImportDriverExceptionCode = void 0;
var MessageImportDriverExceptionCode;
(function (MessageImportDriverExceptionCode) {
    MessageImportDriverExceptionCode["IMAP_AUTH_FAILED"] = "IMAP_AUTH_FAILED";
    MessageImportDriverExceptionCode["IMAP_CONNECTION_FAILED"] = "IMAP_CONNECTION_FAILED";
    MessageImportDriverExceptionCode["MICROSOFT_AUTH_FAILED"] = "MICROSOFT_AUTH_FAILED";
    MessageImportDriverExceptionCode["INBOX_PARSE_ERROR"] = "INBOX_PARSE_ERROR";
})(MessageImportDriverExceptionCode || (exports.MessageImportDriverExceptionCode = MessageImportDriverExceptionCode = {}));
class MessageImportDriverException extends Error {
    code;
    constructor(code, message) {
        super(message || code);
        this.code = code;
    }
}
exports.MessageImportDriverException = MessageImportDriverException;
