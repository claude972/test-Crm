"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageImportExceptionHandlerService = exports.MessageImportSyncStep = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("src/shared/utils");
const constants_1 = require("kovaa-lab-shared/constants");
const types_1 = require("src/shared/types");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const connected_account_refresh_tokens_exception_1 = require("src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception");
const kovaa_lab_orm_exception_1 = require("src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const messaging_throttle_max_attempts_1 = require("src/modules/messaging/message-import-manager/constants/messaging-throttle-max-attempts");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const message_network_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-network.exception");
const messaging_monitoring_service_1 = require("src/modules/messaging/monitoring/services/messaging-monitoring.service");
var MessageImportSyncStep;
(function (MessageImportSyncStep) {
    MessageImportSyncStep["MESSAGE_LIST_FETCH"] = "MESSAGE_LIST_FETCH";
    MessageImportSyncStep["MESSAGES_IMPORT_PENDING"] = "MESSAGES_IMPORT_PENDING";
    MessageImportSyncStep["MESSAGES_IMPORT_ONGOING"] = "MESSAGES_IMPORT_ONGOING";
})(MessageImportSyncStep || (exports.MessageImportSyncStep = MessageImportSyncStep = {}));
let MessageImportExceptionHandlerService = class MessageImportExceptionHandlerService {
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
exports.MessageImportExceptionHandlerService = MessageImportExceptionHandlerService;
exports.MessageImportExceptionHandlerService = MessageImportExceptionHandlerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _a : Object, message_channel_sync_status_service_1.MessageChannelSyncStatusService, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object, typeof (_c = typeof messaging_monitoring_service_1.MessagingMonitoringService !== "undefined" && messaging_monitoring_service_1.MessagingMonitoringService) === "function" ? _c : Object])
], MessageImportExceptionHandlerService);
