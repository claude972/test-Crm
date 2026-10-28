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
var MessagingResetChannelCommand_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingResetChannelCommand = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const nest_commander_1 = require("nest-commander");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
let MessagingResetChannelCommand = MessagingResetChannelCommand_1 = class MessagingResetChannelCommand extends nest_commander_1.CommandRunner {
    workspaceOrmManager;
    messageChannelRepository;
    messagingChannelSyncStatusService;
    messagingMessageCleanerService;
    logger = new common_1.Logger(MessagingResetChannelCommand_1.name);
    constructor(workspaceOrmManager, messageChannelRepository, messagingChannelSyncStatusService, messagingMessageCleanerService) {
        super();
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messagingChannelSyncStatusService = messagingChannelSyncStatusService;
        this.messagingMessageCleanerService = messagingMessageCleanerService;
    }
    async run(_passedParam, options) {
        const { workspaceId, messageChannelId } = options;
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            this.logger.log(`No message channel ID provided, resetting all message channels in workspace ${workspaceId}`);
            const messageChannels = await this.messageChannelRepository.find({
                where: {
                    ...((0, utils_1.isDefined)(messageChannelId) ? { id: messageChannelId } : {}),
                    workspaceId,
                },
            });
            if (messageChannels.length === 0) {
                this.logger.log(`No message channels found in workspace ${workspaceId}`);
                return;
            }
            this.logger.log(`Found ${messageChannels.length} message channels to reset`);
            for (const messageChannel of messageChannels) {
                await this.messagingChannelSyncStatusService.resetAndMarkAsMessagesListFetchPending([messageChannel.id], workspaceId);
                await this.messagingMessageCleanerService.cleanOrphanMessagesAndThreads(workspaceId);
            }
            this.logger.log(`Successfully reset all ${messageChannels.length} message channels in workspace ${workspaceId}`);
        }, authContext, { lite: true });
    }
    parseWorkspaceId(value) {
        return value;
    }
    parseMessageChannelId(value) {
        return value;
    }
};
exports.MessagingResetChannelCommand = MessagingResetChannelCommand;
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-w, --workspace-id <workspace_id>',
        description: 'Workspace ID',
        required: true,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], MessagingResetChannelCommand.prototype, "parseWorkspaceId", null);
__decorate([
    (0, nest_commander_1.Option)({
        flags: '-c, --message-channel-id [message_channel_id]',
        description: 'Message Channel ID (optional - if not provided, all channels will be reset)',
        required: false,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String)
], MessagingResetChannelCommand.prototype, "parseMessageChannelId", null);
exports.MessagingResetChannelCommand = MessagingResetChannelCommand = MessagingResetChannelCommand_1 = __decorate([
    (0, nest_commander_1.Command)({
        name: 'messaging:reset-channel',
        description: 'Reset message channel(s) for full resync. If no channel ID provided, resets all channels in the workspace.',
    }),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository,
        message_channel_sync_status_service_1.MessageChannelSyncStatusService,
        messaging_message_cleaner_service_1.MessagingMessageCleanerService])
], MessagingResetChannelCommand);
