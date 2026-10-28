"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseImapAuthenticationError = parseImapAuthenticationError;
const message_import_driver_exception_1 = require("../exceptions/message-import-driver.exception");
function parseImapAuthenticationError(error) {
    if (error.message?.includes('authentication')) {
        return new message_import_driver_exception_1.MessageImportDriverException(message_import_driver_exception_1.MessageImportDriverExceptionCode.IMAP_AUTH_FAILED, error.message);
    }
    return new message_import_driver_exception_1.MessageImportDriverException(message_import_driver_exception_1.MessageImportDriverExceptionCode.IMAP_CONNECTION_FAILED, error.message);
}
