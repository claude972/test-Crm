"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMicrosoftMessagesImportError = void 0;
const microsoft_permanent_account_error_codes_constant_1 = require("src/modules/connected-account/constants/microsoft-permanent-account-error-codes.constant");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const utils_1 = require("kovaa-lab-shared/utils");
const parseMicrosoftMessagesImportError = (error, options) => {
    if ((0, utils_1.isDefined)(error.code) &&
        microsoft_permanent_account_error_codes_constant_1.MICROSOFT_PERMANENT_ACCOUNT_ERROR_CODES.includes(error.code)) {
        return new message_import_driver_exception_1.MessageImportDriverException(`Disabled, deleted, unlicensed or inaccessible Microsoft account - code:${error.code}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS, { cause: options?.cause });
    }
    if (error.statusCode === 400 && (0, utils_1.isDefined)(error.message)) {
        return new message_import_driver_exception_1.MessageImportDriverException(`Invalid request to Microsoft Graph API: ${error.message}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.UNKNOWN, { cause: options?.cause });
    }
    if (error.statusCode === 404) {
        return new message_import_driver_exception_1.MessageImportDriverException(`Not found - code:${error.code}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.NOT_FOUND, { cause: options?.cause });
    }
    if (error.statusCode === 410) {
        return new message_import_driver_exception_1.MessageImportDriverException(`Sync cursor error: ${error.message}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.SYNC_CURSOR_ERROR, { cause: options?.cause });
    }
    return new message_import_driver_exception_1.MessageImportDriverException(`Microsoft Graph API ${error.code} ${error.statusCode} error: ${error.message}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.TEMPORARY_ERROR, { cause: options?.cause });
};
exports.parseMicrosoftMessagesImportError = parseMicrosoftMessagesImportError;
