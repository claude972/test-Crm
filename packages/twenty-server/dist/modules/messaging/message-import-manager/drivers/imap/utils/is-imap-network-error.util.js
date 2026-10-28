"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImapNetworkError = void 0;
const utils_1 = require("kovaa-lab-shared/utils");
const message_network_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-network.exception");
const IMAPFLOW_TIMEOUT_ERROR_CODES = [
    'ETIMEOUT',
    'UPGRADE_TIMEOUT',
    'CONNECT_TIMEOUT',
    'GREETING_TIMEOUT',
];
const IMAPFLOW_CONNECTION_ERROR_CODES = [
    'NoConnection',
    'EConnectionClosed',
    'ProxyError',
    'ClosedAfterConnectTLS',
    'ClosedAfterConnectText',
];
const NODEJS_NETWORK_ERROR_CODES = [
    message_network_exception_1.MessageNetworkExceptionCode.ECONNREFUSED,
    message_network_exception_1.MessageNetworkExceptionCode.ECONNRESET,
    message_network_exception_1.MessageNetworkExceptionCode.ENOTFOUND,
    message_network_exception_1.MessageNetworkExceptionCode.ECONNABORTED,
    message_network_exception_1.MessageNetworkExceptionCode.ETIMEDOUT,
    message_network_exception_1.MessageNetworkExceptionCode.ERR_NETWORK,
    message_network_exception_1.MessageNetworkExceptionCode.EHOSTUNREACH,
];
const isImapNetworkError = (error) => {
    const errorWithCode = error;
    if (!(0, utils_1.isDefined)(errorWithCode.code)) {
        return false;
    }
    if (IMAPFLOW_TIMEOUT_ERROR_CODES.includes(errorWithCode.code)) {
        return true;
    }
    if (IMAPFLOW_CONNECTION_ERROR_CODES.includes(errorWithCode.code)) {
        return true;
    }
    if (NODEJS_NETWORK_ERROR_CODES.includes(errorWithCode.code)) {
        return true;
    }
    return false;
};
exports.isImapNetworkError = isImapNetworkError;
