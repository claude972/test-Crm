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
exports.MessagingOngoingStaleCronJob = exports.MESSAGING_ONGOING_STALE_CRON_PATTERN = void 0;
const typeorm_1 = require("@nestjs/typeorm");
const workspace_1 = require("kovaa-lab-shared/workspace");
const typeorm_2 = require("typeorm");
const sentry_cron_monitor_decorator_1 = require("src/engine/core-modules/cron/sentry-cron-monitor.decorator");
const exception_handler_service_1 = require("src/engine/core-modules/exception-handler/exception-handler.service");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const messaging_import_ongoing_sync_timeout_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-import-ongoing-sync-timeout.constant");
const messaging_ongoing_stale_sync_stages_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-ongoing-stale-sync-stages.constant");
const messaging_ongoing_stale_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-ongoing-stale.job");
exports.MESSAGING_ONGOING_STALE_CRON_PATTERN = '0 * * * *';
let MessagingOngoingStaleCronJob = class MessagingOngoingStaleCronJob {
    messageChannelRepository;
    messageQueueService;
    exceptionHandlerService;
    constructor(messageChannelRepository, messageQueueService, exceptionHandlerService) {
        this.messageChannelRepository = messageChannelRepository;
        this.messageQueueService = messageQueueService;
        this.exceptionHandlerService = exceptionHandlerService;
    }
    async handle() {
        const staleWorkspaceIds = await this.findStaleWorkspaceIds();
        for (const workspaceId of staleWorkspaceIds) {
            try {
                await this.messageQueueService.add(messaging_ongoing_stale_job_1.MessagingOngoingStaleJob.name, {
                    workspaceId,
                });
            }
            catch (error) {
                this.exceptionHandlerService.captureExceptions([error], {
                    workspace: {
                        id: workspaceId,
                    },
                });
            }
        }
    }
    async findStaleWorkspaceIds() {
        const staleBefore = new Date(Date.now() - messaging_import_ongoing_sync_timeout_constant_1.MESSAGING_IMPORT_ONGOING_SYNC_TIMEOUT);
        const staleChannels = await this.messageChannelRepository.find({
            select: {
                workspaceId: true,
            },
            where: {
                syncStage: (0, typeorm_2.In)(messaging_ongoing_stale_sync_stages_constant_1.MESSAGING_ONGOING_STALE_SYNC_STAGES),
                syncStageStartedAt: (0, typeorm_2.Or)((0, typeorm_2.IsNull)(), (0, typeorm_2.LessThan)(staleBefore)),
                workspace: {
                    deletedAt: (0, typeorm_2.IsNull)(),
                    activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                },
            },
        });
        return [...new Set(staleChannels.map(({ workspaceId }) => workspaceId))];
    }
};
exports.MessagingOngoingStaleCronJob = MessagingOngoingStaleCronJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingOngoingStaleCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingOngoingStaleCronJob.name, exports.MESSAGING_ONGOING_STALE_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MessagingOngoingStaleCronJob.prototype, "handle", null);
exports.MessagingOngoingStaleCronJob = MessagingOngoingStaleCronJob = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(1, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object])
], MessagingOngoingStaleCronJob);
