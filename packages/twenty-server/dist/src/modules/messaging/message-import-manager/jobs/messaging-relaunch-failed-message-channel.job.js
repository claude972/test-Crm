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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingRelaunchFailedMessageChannelJob = void 0;
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
let MessagingRelaunchFailedMessageChannelJob = class MessagingRelaunchFailedMessageChannelJob {
    workspaceOrmManager;
    messageChannelRepository;
    constructor(workspaceOrmManager, messageChannelRepository) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
    }
    async handle(data) {
        const { workspaceId, messageChannelId } = data;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannel = await this.messageChannelRepository.findOne({
                where: {
                    id: messageChannelId,
                    workspaceId,
                },
            });
            if (!messageChannel ||
                messageChannel.syncStage !== types_1.MessageChannelSyncStage.FAILED ||
                messageChannel.syncStatus !== types_1.MessageChannelSyncStatus.FAILED_UNKNOWN) {
                return;
            }
            await this.messageChannelRepository.update({ id: messageChannelId, workspaceId }, {
                syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
                syncStatus: types_1.MessageChannelSyncStatus.ACTIVE,
                throttleFailureCount: 0,
                throttleRetryAfter: null,
                syncStageStartedAt: null,
            });
        }, authContext, { lite: true });
    }
};
exports.MessagingRelaunchFailedMessageChannelJob = MessagingRelaunchFailedMessageChannelJob;
__decorate([
    (0, process_decorator_1.Process)(MessagingRelaunchFailedMessageChannelJob.name),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagingRelaunchFailedMessageChannelJob.prototype, "handle", null);
exports.MessagingRelaunchFailedMessageChannelJob = MessagingRelaunchFailedMessageChannelJob = __decorate([
    (0, processor_decorator_1.Processor)({
        queueName: message_queue_constants_1.MessageQueue.messagingQueue,
        scope: common_1.Scope.REQUEST,
    }),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository])
], MessagingRelaunchFailedMessageChannelJob);
