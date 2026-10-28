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
var MessagingOngoingStaleJob_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingOngoingStaleJob = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const process_decorator_1 = require("src/engine/core-modules/message-queue/decorators/process.decorator");
const processor_decorator_1 = require("src/engine/core-modules/message-queue/decorators/processor.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const messaging_ongoing_stale_sync_stages_constant_1 = require("src/modules/messaging/message-import-manager/constants/messaging-ongoing-stale-sync-stages.constant");
const is_sync_stale_util_1 = require("src/modules/messaging/message-import-manager/utils/is-sync-stale.util");
const toIsoStringOrNull_1 = require("src/utils/date/toIsoStringOrNull");
let MessagingOngoingStaleJob = MessagingOngoingStaleJob_1 = class MessagingOngoingStaleJob {
    workspaceOrmManager;
    messageChannelRepository;
    messageChannelSyncStatusService;
    logger = new common_1.Logger(MessagingOngoingStaleJob_1.name);
    constructor(workspaceOrmManager, messageChannelRepository, messageChannelSyncStatusService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageChannelSyncStatusService = messageChannelSyncStatusService;
    }
    async handle(data) {
        const { workspaceId } = data;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannels = await this.messageChannelRepository.find({
                where: {
                    syncStage: (0, typeorm_2.In)(messaging_ongoing_stale_sync_stages_constant_1.MESSAGING_ONGOING_STALE_SYNC_STAGES),
                    workspaceId,
                },
            });
            for (const messageChannel of messageChannels) {
                if ((0, is_sync_stale_util_1.isSyncStale)((0, toIsoStringOrNull_1.toIsoStringOrNull)(messageChannel.syncStageStartedAt))) {
                    await this.messageChannelSyncStatusService.resetSyncStageStartedAt([messageChannel.id], workspaceId);
                    switch (messageChannel.syncStage) {
                        case types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_ONGOING:
                        case types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED:
                            this.logger.log(`Sync for message channel ${messageChannel.id} and workspace ${workspaceId} is stale. Setting sync stage to MESSAGE_LIST_FETCH_PENDING`);
                            await this.messageChannelSyncStatusService.markAsMessagesListFetchPending([messageChannel.id], workspaceId);
                            break;
                        case types_1.MessageChannelSyncStage.MESSAGES_IMPORT_ONGOING:
                        case types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED:
                            this.logger.log(`Sync for message channel ${messageChannel.id} and workspace ${workspaceId} is stale. Setting sync stage to MESSAGES_IMPORT_PENDING`);
                            await this.messageChannelSyncStatusService.markAsMessagesImportPending([messageChannel.id], workspaceId);
                            break;
                        default:
                            break;
                    }
                }
            }
        }, authContext, { lite: true });
    }
};
exports.MessagingOngoingStaleJob = MessagingOngoingStaleJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingOngoingStaleJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagingOngoingStaleJob.prototype, "handle", null);
exports.MessagingOngoingStaleJob = MessagingOngoingStaleJob = MessagingOngoingStaleJob_1 = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository,
        message_channel_sync_status_service_1.MessageChannelSyncStatusService])
], MessagingOngoingStaleJob);
