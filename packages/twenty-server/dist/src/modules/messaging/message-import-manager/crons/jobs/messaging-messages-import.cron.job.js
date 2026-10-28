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
var MessagingMessagesImportCronJob_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessagesImportCronJob = exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN = void 0;
const lodash_groupby_1 = __importDefault(require("lodash.groupby"));
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const constants_1 = require("kovaa-lab-shared/constants");
const utils_1 = require("kovaa-lab-shared/utils");
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
const workspace_entity_1 = require("src/engine/core-modules/workspace/workspace.entity");
const messaging_messages_import_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-messages-import.job");
const is_throttled_1 = require("src/modules/connected-account/utils/is-throttled");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const toIsoStringOrNull_1 = require("src/utils/date/toIsoStringOrNull");
exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN = '*/1 * * * *';
let MessagingMessagesImportCronJob = MessagingMessagesImportCronJob_1 = class MessagingMessagesImportCronJob {
    workspaceRepository;
    messageQueueService;
    exceptionHandlerService;
    messageChannelRepository;
    logger = new common_1.Logger(MessagingMessagesImportCronJob_1.name);
    constructor(workspaceRepository, messageQueueService, exceptionHandlerService, messageChannelRepository) {
        this.workspaceRepository = workspaceRepository;
        this.messageQueueService = messageQueueService;
        this.exceptionHandlerService = exceptionHandlerService;
        this.messageChannelRepository = messageChannelRepository;
    }
    async handle() {
        const pendingMessageChannelsAcrossWorkspaces = await this.messageChannelRepository.find({
            where: {
                isSyncEnabled: true,
                syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_PENDING,
                type: (0, typeorm_2.In)([...constants_1.POLLED_MESSAGE_CHANNEL_TYPES]),
                workspace: {
                    activationStatus: workspace_1.WorkspaceActivationStatus.ACTIVE,
                    deletedAt: (0, typeorm_2.IsNull)(),
                },
            },
        });
        const pendingMessageChannelsByWorkspaceId = (0, lodash_groupby_1.default)(pendingMessageChannelsAcrossWorkspaces, 'workspaceId');
        for (const [workspaceId, pendingMessageChannels] of Object.entries(pendingMessageChannelsByWorkspaceId)) {
            try {
                const messageChannelsToSchedule = pendingMessageChannels.filter((messageChannel) => !(0, is_throttled_1.isThrottled)((0, toIsoStringOrNull_1.toIsoStringOrNull)(messageChannel.syncStageStartedAt), messageChannel.throttleFailureCount, (0, toIsoStringOrNull_1.toIsoStringOrNull)(messageChannel.throttleRetryAfter)));
                const throttledCount = pendingMessageChannels.length - messageChannelsToSchedule.length;
                if (throttledCount > 0) {
                    this.logger.log(`Skipped ${throttledCount} throttled message channels for workspace ${workspaceId}`);
                }
                if (messageChannelsToSchedule.length === 0) {
                    continue;
                }
                const messageChannelIdsToSchedule = messageChannelsToSchedule.map((messageChannel) => messageChannel.id);
                const updateResult = await this.messageChannelRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                    syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED,
                    syncStageStartedAt: new Date(),
                })
                    .where({
                    id: (0, typeorm_2.In)(messageChannelIdsToSchedule),
                    workspaceId,
                    isSyncEnabled: true,
                    syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_PENDING,
                })
                    .returning('id')
                    .execute();
                const updatedIds = updateResult.raw.map((row) => row.id);
                for (const messageChannelId of updatedIds) {
                    await this.messageQueueService.add(messaging_messages_import_job_1.MessagingMessagesImportJob.name, {
                        workspaceId,
                        messageChannelId,
                    });
                }
            }
            catch (error) {
                if (error.code === '42P01' &&
                    error.message.includes('messageChannel" does not exist')) {
                    const refetchedWorkspace = await this.workspaceRepository.findOneBy({
                        id: workspaceId,
                    });
                    if ((0, utils_1.isDefined)(refetchedWorkspace)) {
                        this.exceptionHandlerService.captureExceptions([error], {
                            workspace: {
                                id: workspaceId,
                            },
                        });
                        throw new Error('Workspace schema not found while the workspace is still active');
                    }
                }
                else {
                    this.exceptionHandlerService.captureExceptions([error], {
                        workspace: {
                            id: workspaceId,
                        },
                    });
                }
            }
        }
    }
};
exports.MessagingMessagesImportCronJob = MessagingMessagesImportCronJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingMessagesImportCronJob.name),
    (0, sentry_cron_monitor_decorator_1.SentryCronMonitor)(MessagingMessagesImportCronJob.name, exports.MESSAGING_MESSAGES_IMPORT_CRON_PATTERN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MessagingMessagesImportCronJob.prototype, "handle", null);
exports.MessagingMessagesImportCronJob = MessagingMessagesImportCronJob = MessagingMessagesImportCronJob_1 = __decorate([
    (0, processor_decorator_1.Processor)(message_queue_constants_1.MessageQueue.cronQueue),
    __param(0, (0, typeorm_1.InjectRepository)(workspace_entity_1.WorkspaceEntity)),
    __param(1, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository, typeof (_a = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _a : Object, typeof (_b = typeof exception_handler_service_1.ExceptionHandlerService !== "undefined" && exception_handler_service_1.ExceptionHandlerService) === "function" ? _b : Object, typeorm_2.Repository])
], MessagingMessagesImportCronJob);
