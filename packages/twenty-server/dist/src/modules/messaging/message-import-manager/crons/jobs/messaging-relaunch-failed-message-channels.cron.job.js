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
exports.MessagingRelaunchFailedMessageChannelsCronJob = exports.MESSAGING_RELAUNCH_FAILED_MESSAGE_CHANNELS_CRON_PATTERN = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const constants_1 = require("kovaa-lab-shared/constants");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const messaging_relaunch_failed_message_channel_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-relaunch-failed-message-channel.job");
exports.MESSAGING_RELAUNCH_FAILED_MESSAGE_CHANNELS_CRON_PATTERN = '*/30 * * * *';
let MessagingRelaunchFailedMessageChannelsCronJob = class MessagingRelaunchFailedMessageChannelsCronJob {
    workspaceRepository;
    messageChannelRepository;
    messageQueueService;
    exceptionHandlerService;
    constructor(workspaceRepository, messageChannelRepository, messageQueueService, exceptionHandlerService) {
        this.workspaceRepository = workspaceRepository;
        this.messageChannelRepository = messageChannelRepository;
        this.messageQueueService = messageQueueService;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        const activeWorkspaces = await this.workspaceRepository.find({
            where: {
                activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
            },
        });
        const activeWorkspaceIds = activeWorkspaces.map((workspace) => workspace.id);
        if (activeWorkspaceIds.length === 0) {
            return;
        }
        const failedMessageChannels = await this.messageChannelRepository
            .find({
            where: {
                syncStage: types_1.MessageChannelSyncStage.FAILED,
                syncStatus: types_1.MessageChannelSyncStatus.FAILED_UNKNOWN,
                type: (0, typeorm_2.In)([...constants_1.POLLED_MESSAGE_CHANNEL_TYPES]),
                workspaceId: (0, typeorm_2.In)(activeWorkspaceIds),
            },
        })
            .catch((error) => {
            this.exceptionHandlerService.captureExceptions([error]);
            return [];
        });
        for (const messageChannel of failedMessageChannels) {
            try {
                await this.messageQueueService.add(messaging_relaunch_failed_message_channel_job_1.MessagingRelaunchFailedMessageChannelJob.name, {
                    workspaceId: messageChannel.workspaceId,
                    messageChannelId: messageChannel.id,
                });
            }
            catch (error) {
                this.exceptionHandlerService.captureExceptions([error], {
                    workspace: {
                        id: messageChannel.workspaceId,
                    },
                });
            }
        }
    }
};
exports.MessagingRelaunchFailedMessageChannelsCronJob = MessagingRelaunchFailedMessageChannelsCronJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingRelaunchFailedMessageChannelsCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingRelaunchFailedMessageChannelsCronJob.name, exports.MESSAGING_RELAUNCH_FAILED_MESSAGE_CHANNELS_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MessagingRelaunchFailedMessageChannelsCronJob.prototype, "handle", null);
exports.MessagingRelaunchFailedMessageChannelsCronJob = MessagingRelaunchFailedMessageChannelsCronJob = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(2, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository, typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], MessagingRelaunchFailedMessageChannelsCronJob);
