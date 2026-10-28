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
var MessagingTriggerMessageListFetchCommand_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingTriggerMessageListFetchCommand = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nest_commander_1 = require("nest-commander");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const message_queue_decorator_1 = require("src/engine/core-modules/message-queue/decorators/message-queue.decorator");
const message_queue_constants_1 = require("src/engine/core-modules/message-queue/message-queue.constants");
const message_queue_service_1 = require("src/engine/core-modules/message-queue/services/message-queue.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_message_list_fetch_job_1 = require("src/modules/messaging/message-import-manager/jobs/messaging-message-list-fetch.job");
let MessagingTriggerMessageListFetchCommand = MessagingTriggerMessageListFetchCommand_1 = class MessagingTriggerMessageListFetchCommand extends nest_commander_1.CommandRunner {
    workspaceOrmManager;
    messageChannelRepository;
    messageQueueService;
    logger = new common_1.Logger(MessagingTriggerMessageListFetchCommand_1.name);
    constructor(workspaceOrmManager, messageChannelRepository, messageQueueService) {
        super();
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageQueueService = messageQueueService;
    }
    async run(_passedParam, options) {
        const { workspaceId, messageChannelId } = options;
        this.logger.log(`Triggering message list fetch for workspace ${workspaceId}${messageChannelId ? ` and channel ${messageChannelId}` : ' (all pending channels)'}`);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageChannels = await this.messageChannelRepository.find({
                where: {
                    isSyncEnabled: true,
                    syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_PENDING,
                    ...(messageChannelId ? { id: messageChannelId } : {}),
                    workspaceId,
                },
            });
            if (messageChannels.length === 0) {
                this.logger.warn('No message channels found with MESSAGE_LIST_FETCH_PENDING status');
                return;
            }
            this.logger.log(`Found ${messageChannels.length} message channel(s) to process`);
            for (const messageChannel of messageChannels) {
                await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                    syncStage: types_1.MessageChannelSyncStage.MESSAGE_LIST_FETCH_SCHEDULED,
                    syncStageStartedAt: new Date().toISOString(),
                });
                await this.messageQueueService.add(messaging_message_list_fetch_job_1.MessagingMessageListFetchJob.name, {
                    messageChannelId: messageChannel.id,
                    workspaceId,
                });
                this.logger.log(`Triggered fetch for message channel ${messageChannel.id}`);
            }
            this.logger.log(`Successfully triggered ${messageChannels.length} message list fetch job(s)`);
        }, authContext, { lite: true });
    }
    parseWorkspaceId(value) {
        return value;
    }
    parseMessageChannelId(value) {
        return value;
    }
};
exports.MessagingTriggerMessageListFetchCommand = MessagingTriggerMessageListFetchCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-w, --workspace-id <workspace_id>',
        description: 'Workspace ID',
        required: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], MessagingTriggerMessageListFetchCommand.prototype, "parseWorkspaceId", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-m, --message-channel-id [message_channel_id]',
        description: 'Message Channel ID (optional - if not provided, triggers for all pending channels)',
        required: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], MessagingTriggerMessageListFetchCommand.prototype, "parseMessageChannelId", null);
exports.MessagingTriggerMessageListFetchCommand = MessagingTriggerMessageListFetchCommand = MessagingTriggerMessageListFetchCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'messaging:trigger-message-list-fetch',
        description: 'Trigger message list fetch immediately without waiting for cron',
    }),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(2, (0, message_queue_decorator_1.InjectMessageQueue)(message_queue_constants_1.MessageQueue.messagingQueue)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof message_queue_service_1.MessageQueueService !== "undefined" && message_queue_service_1.MessageQueueService) === "function" ? _b : Object])
], MessagingTriggerMessageListFetchCommand);
