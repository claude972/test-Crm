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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageChannelSyncStatusMonitoringCronJob = exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const lodash_snakecase_1 = __importDefault(require("lodash.snakecase"));
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_monitoring_service_1 = require("src/modules/messaging/monitoring/services/messaging-monitoring.service");
exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN = '2/10 * * * *'; //Every 10 minutes, starting at 2 minutes past the hour
let MessagingMessageChannelSyncStatusMonitoringCronJob = class MessagingMessageChannelSyncStatusMonitoringCronJob {
    workspaceRepository;
    messagingMonitoringService;
    workspaceOrmManager;
    messageChannelRepository;
    exceptionHandlerService;
    constructor(workspaceRepository, messagingMonitoringService, workspaceOrmManager, messageChannelRepository, exceptionHandlerService) {
        this.workspaceRepository = workspaceRepository;
        this.messagingMonitoringService = messagingMonitoringService;
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        await this.messagingMonitoringService.track({
            eventName: 'message_channel.monitoring.sync_status.start',
            message: 'Starting message channel sync status monitoring',
        });
        const activeWorkspaces = await this.workspaceRepository.find({
            where: {
                activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
            },
        });
        for (const activeWorkspace of activeWorkspaces) {
            try {
                const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(activeWorkspace.id);
                await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                    const messageChannels = await this.messageChannelRepository.find({
                        select: ['id', 'syncStatus', 'connectedAccountId'],
                        where: { workspaceId: activeWorkspace.id },
                    });
                    for (const messageChannel of messageChannels) {
                        if (!messageChannel.syncStatus) {
                            continue;
                        }
                        await this.messagingMonitoringService.track({
                            eventName: `message_channel.monitoring.sync_status.${(0, lodash_snakecase_1.default)(messageChannel.syncStatus)}`,
                            workspaceId: activeWorkspace.id,
                            connectedAccountId: messageChannel.connectedAccountId,
                            messageChannelId: messageChannel.id,
                            message: messageChannel.syncStatus,
                        });
                    }
                }, authContext, { lite: true });
            }
            catch (error) {
                this.exceptionHandlerService.captureExceptions([error], {
                    workspace: {
                        id: activeWorkspace.id,
                    },
                });
            }
        }
    }
};
exports.MessagingMessageChannelSyncStatusMonitoringCronJob = MessagingMessageChannelSyncStatusMonitoringCronJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingMessageChannelSyncStatusMonitoringCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingMessageChannelSyncStatusMonitoringCronJob.name, exports.MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MessagingMessageChannelSyncStatusMonitoringCronJob.prototype, "handle", null);
exports.MessagingMessageChannelSyncStatusMonitoringCronJob = MessagingMessageChannelSyncStatusMonitoringCronJob = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof messaging_monitoring_service_1.MessagingMonitoringService !== "undefined" && messaging_monitoring_service_1.MessagingMonitoringService) === "function" ? _a : Object, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeorm_2.Repository, typeof (_c = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _c : Object])
], MessagingMessageChannelSyncStatusMonitoringCronJob);
