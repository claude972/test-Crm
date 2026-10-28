"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageImportExceptionHandlerService = exports.MessageImportSyncStep = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("src/shared/utils");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("src/shared/types");
const connected_account_refresh_tokens_exception_1 = require("src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception");
const kovaa_lab_orm_exception_1 = require("src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception");
const messaging_throttle_max_attempts_1 = require("src/modules/messaging/message-import-manager/constants/messaging-throttle-max-attempts");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const message_network_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-network.exception");
var MessageImportSyncStep;
(function (MessageImportSyncStep) {
    MessageImportSyncStep["MESSAGE_LIST_FETCH"] = "MESSAGE_LIST_FETCH";
    MessageImportSyncStep["MESSAGES_IMPORT_PENDING"] = "MESSAGES_IMPORT_PENDING";
    MessageImportSyncStep["MESSAGES_IMPORT_ONGOING"] = "MESSAGES_IMPORT_ONGOING";
})(MessageImportSyncStep || (exports.MessageImportSyncStep = MessageImportSyncStep = {}));
let MessageImportExceptionHandlerService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessageImportExceptionHandlerService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessageImportExceptionHandlerService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        messageChannelRepository;
        messageChannelSyncStatusService;
        exceptionHandlerService;
        messagingMonitoringService;
        constructor(messageChannelRepository, messageChannelSyncStatusService, exceptionHandlerService, messagingMonitoringService) {
            this.messageChannelRepository = messageChannelRepository;
            this.messageChannelSyncStatusService = messageChannelSyncStatusService;
            this.exceptionHandlerService = exceptionHandlerService;
            this.messagingMonitoringService = messagingMonitoringService;
        }
        async handleDriverException(exception, syncStep, messageChannel, workspaceId) {
            if (exception instanceof message_import_driver_exception_1.MessageImportDriverException) {
                exception.context = {
                    ...exception.context,
                    messageChannelId: messageChannel.id,
                    workspaceId,
                    syncStep,
                };
            }
            if ('code' in exception) {
                switch (exception.code) {
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.NOT_FOUND:
                        await this.handleNotFoundException(syncStep, messageChannel, workspaceId);
                        break;
                    case kovaa_lab_orm_exception_1.KovaaLabCRMOrmExceptionCode.QUERY_READ_TIMEOUT:
                    case kovaa_lab_orm_exception_1.KovaaLabCRMOrmExceptionCode.TRANSIENT_DATABASE_ERROR:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.TEMPORARY_ERROR:
                    case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.TEMPORARY_NETWORK_ERROR:
                    case message_network_exception_1.MessageNetworkExceptionCode.ECONNABORTED:
                    case message_network_exception_1.MessageNetworkExceptionCode.ENOTFOUND:
                    case message_network_exception_1.MessageNetworkExceptionCode.ECONNRESET:
                    case message_network_exception_1.MessageNetworkExceptionCode.ETIMEDOUT:
                    case message_network_exception_1.MessageNetworkExceptionCode.ERR_NETWORK:
                        await this.handleTemporaryException(syncStep, messageChannel, workspaceId, exception);
                        break;
                    case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.REFRESH_TOKEN_NOT_FOUND:
                    case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.INVALID_REFRESH_TOKEN:
                        await this.messagingMonitoringService.track({
                            eventName: `refresh_token.error.insufficient_permissions`,
                            workspaceId,
                            connectedAccountId: messageChannel.connectedAccountId,
                            messageChannelId: messageChannel.id,
                            message: `${exception.code}: ${exception.message ?? ''}`,
                        });
                        await this.handleInsufficientPermissionsException(messageChannel, workspaceId);
                        break;
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS:
                        await this.handleInsufficientPermissionsException(messageChannel, workspaceId);
                        break;
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.SERVER_CERTIFICATE_INVALID:
                        await this.messageChannelSyncStatusService.markAsFailed({
                            messageChannelIds: [messageChannel.id],
                            workspaceId,
                            syncStatus: types_1.MessageChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS,
                            authFailedReason: constants_1.MAIL_SERVER_CERTIFICATE_INVALID_AUTH_FAILED_REASON,
                        });
                        break;
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.SYNC_CURSOR_ERROR:
                        await this.handleSyncCursorErrorException(messageChannel, workspaceId);
                        break;
                    case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.ACCESS_TOKEN_NOT_FOUND:
                    case connected_account_refresh_tokens_exception_1.ConnectedAccountRefreshAccessTokenExceptionCode.PROVIDER_NOT_SUPPORTED:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.CHANNEL_MISCONFIGURED:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.ACCESS_TOKEN_MISSING:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.PROVIDER_NOT_SUPPORTED:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.UNKNOWN:
                    case message_import_driver_exception_1.MessageImportDriverExceptionCode.UNKNOWN_NETWORK_ERROR:
                    default:
                        await this.handleUnknownException(exception, messageChannel, workspaceId, syncStep);
                        break;
                }
            }
            else {
                await this.handleUnknownException(exception, messageChannel, workspaceId, syncStep);
            }
        }
        async handleSyncCursorErrorException(messageChannel, workspaceId) {
            await this.messageChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending([messageChannel.id], workspaceId);
        }
        async handleTemporaryException(syncStep, messageChannel, workspaceId, exception) {
            if (messageChannel.throttleFailureCount >= messaging_throttle_max_attempts_1.MESSAGING_THROTTLE_MAX_ATTEMPTS) {
                await this.messageChannelSyncStatusService.markAsFailed({
                    messageChannelIds: [messageChannel.id],
                    workspaceId,
                    syncStatus: types_1.MessageChannelSyncStatus.FAILED_UNKNOWN,
                });
                this.exceptionHandlerService.captureExceptions([
                    new Error(`Temporary error occurred ${messaging_throttle_max_attempts_1.MESSAGING_THROTTLE_MAX_ATTEMPTS} times while importing messages for message channel ${messageChannel.id} in workspace ${workspaceId}: ${exception?.message}`),
                ], {
                    additionalData: {
                        messageChannelId: messageChannel.id,
                        syncStep,
                        throttleFailureCount: messageChannel.throttleFailureCount,
                    },
                    workspace: { id: workspaceId },
                });
                return;
            }
            await this.messageChannelRepository.increment(workspaceId, { id: messageChannel.id }, 'throttleFailureCount', 1);
            const throttleRetryAfter = exception instanceof message_import_driver_exception_1.MessageImportDriverException
                ? exception.throttleRetryAfter
                : undefined;
            await this.messageChannelRepository.update(workspaceId, { id: messageChannel.id }, {
                throttleRetryAfter: (0, utils_1.isDefined)(throttleRetryAfter)
                    ? throttleRetryAfter.toISOString()
                    : null,
            });
            switch (syncStep) {
                case MessageImportSyncStep.MESSAGE_LIST_FETCH:
                    await this.messageChannelSyncStatusService.markAsMessagesListFetchPending([messageChannel.id], workspaceId, true);
                    break;
                case MessageImportSyncStep.MESSAGES_IMPORT_PENDING:
                case MessageImportSyncStep.MESSAGES_IMPORT_ONGOING:
                    await this.messageChannelSyncStatusService.markAsMessagesImportPending([messageChannel.id], workspaceId, true);
                    break;
                default:
                    break;
            }
        }
        async handleInsufficientPermissionsException(messageChannel, workspaceId) {
            await this.messageChannelSyncStatusService.markAsFailed({
                messageChannelIds: [messageChannel.id],
                workspaceId,
                syncStatus: types_1.MessageChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS,
            });
        }
        async handleUnknownException(exception, messageChannel, workspaceId, syncStep) {
            this.exceptionHandlerService.captureExceptions([exception], {
                additionalData: {
                    messageChannelId: messageChannel.id,
                    syncStep,
                },
                workspace: { id: workspaceId },
            });
            await this.messageChannelSyncStatusService.markAsFailed({
                messageChannelIds: [messageChannel.id],
                workspaceId,
                syncStatus: types_1.MessageChannelSyncStatus.FAILED_UNKNOWN,
            });
        }
        async handleNotFoundException(syncStep, messageChannel, workspaceId) {
            if (syncStep === MessageImportSyncStep.MESSAGE_LIST_FETCH) {
                await this.messageChannelSyncStatusService.markAsFailed({
                    messageChannelIds: [messageChannel.id],
                    workspaceId,
                    syncStatus: types_1.MessageChannelSyncStatus.FAILED_UNKNOWN,
                });
                this.exceptionHandlerService.captureExceptions([
                    new Error('Not Found exception occurred while fetching message list, which should never happen'),
                ], {
                    additionalData: {
                        messageChannelId: messageChannel.id,
                        syncStep,
                    },
                    workspace: { id: workspaceId },
                });
                return;
            }
            await this.messageChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending([messageChannel.id], workspaceId);
        }
    };
    return MessageImportExceptionHandlerService = _classThis;
})();
exports.MessageImportExceptionHandlerService = MessageImportExceptionHandlerService;
