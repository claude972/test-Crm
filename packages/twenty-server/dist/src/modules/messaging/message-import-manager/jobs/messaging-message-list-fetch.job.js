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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageListFetchJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const messaging_message_list_fetch_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-message-list-fetch.service");
const messaging_monitoring_service_1 = require("src/modules/messaging/monitoring/services/messaging-monitoring.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
let MessagingMessageListFetchJob = class MessagingMessageListFetchJob {
    messagingMessageListFetchService;
    messagingMonitoringService;
    workspaceOrmManager;
    messageChannelRepository;
    messageImportErrorHandlerService;
    constructor(messagingMessageListFetchService, messagingMonitoringService, workspaceOrmManager, messageChannelRepository, messageImportErrorHandlerService) {
        this.messagingMessageListFetchService = messagingMessageListFetchService;
        this.messagingMonitoringService = messagingMonitoringService;
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageImportErrorHandlerService = messageImportErrorHandlerService;
    }
    async handle(data) {
        const { messageChannelId, workspaceId } = data;
        await this.messagingMonitoringService.track({
            eventName: 'message_list_fetch_job.triggered',
            messageChannelId,
            workspaceId,
        });
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannel = await this.messageChannelRepository.findOne({
                where: {
                    id: messageChannelId,
                    workspaceId,
                },
                relations: { connectedAccount: true, messageFolders: true },
            });
            if (!messageChannel) {
                await this.messagingMonitoringService.track({
                    eventName: 'message_list_fetch_job.error.message_channel_not_found',
                    messageChannelId,
                    workspaceId,
                });
                return;
            }
            if (messageChannel.syncStage !==
                types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED) {
                return;
            }
            try {
                await this.messagingMonitoringService.track({
                    eventName: 'message_list_fetch.started',
                    workspaceId,
                    connectedAccountId: messageChannel.connectedAccount.id,
                    messageChannelId: messageChannel.id,
                });
                await this.messagingMessageListFetchService.processMessageListFetch(messageChannel, workspaceId);
                await this.messagingMonitoringService.track({
                    eventName: 'message_list_fetch.completed',
                    workspaceId,
                    connectedAccountId: messageChannel.connectedAccount.id,
                    messageChannelId: messageChannel.id,
                });
            }
            catch (error) {
                await this.messageImportErrorHandlerService.handleDriverException(error, messaging_import_exception_handler_service_1.MessageImportSyncStep.MESSAGE_LIST_FETCH, messageChannel, workspaceId);
            }
        }, authContext, { lite: true });
    }
};
exports.MessagingMessageListFetchJob = MessagingMessageListFetchJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingMessageListFetchJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagingMessageListFetchJob.prototype, "handle", null);
exports.MessagingMessageListFetchJob = MessagingMessageListFetchJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [messaging_message_list_fetch_service_1.MessagingMessageListFetchService, typeof (_a = typeof messaging_monitoring_service_1.MessagingMonitoringService !== "undefined" && messaging_monitoring_service_1.MessagingMonitoringService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeorm_2.Repository,
        messaging_import_exception_handler_service_1.MessageImportExceptionHandlerService])
], MessagingMessageListFetchJob);
