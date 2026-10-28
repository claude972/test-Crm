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
var MessagingProcessGroupEmailActionsService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingProcessGroupEmailActionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_delete_group_email_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-delete-group-email-messages.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let MessagingProcessGroupEmailActionsService = MessagingProcessGroupEmailActionsService_1 = class MessagingProcessGroupEmailActionsService {
    workspaceOrmManager;
    messageChannelRepository;
    messageFolderRepository;
    messagingDeleteGroupEmailMessagesService;
    logger = new common_1.Logger(MessagingProcessGroupEmailActionsService_1.name);
    constructor(workspaceOrmManager, messageChannelRepository, messageFolderRepository, messagingDeleteGroupEmailMessagesService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messageFolderRepository = messageFolderRepository;
        this.messagingDeleteGroupEmailMessagesService = messagingDeleteGroupEmailMessagesService;
    }
    async markMessageChannelAsPendingGroupEmailsAction(messageChannel, workspaceId, pendingGroupEmailsAction) {
        await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, { pendingGroupEmailsAction });
        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Marked message channel as pending group emails action: ${pendingGroupEmailsAction}`);
    }
    async processGroupEmailActions(messageChannel, workspaceId) {
        const { pendingGroupEmailsAction } = messageChannel;
        if (!(0, utils_1.isDefined)(pendingGroupEmailsAction) ||
            pendingGroupEmailsAction === types_1.MessageChannelPendingGroupEmailsAction.NONE) {
            return;
        }
        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Processing group email action: ${pendingGroupEmailsAction}`);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        try {
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                switch (pendingGroupEmailsAction) {
                    case types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_DELETION:
                        await this.handleGroupEmailsDeletion(workspaceId, messageChannel.id);
                        break;
                    case types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_IMPORT:
                        await this.handleGroupEmailsImport(workspaceId, messageChannel.id);
                        break;
                }
            }, authContext, { lite: true });
            await this.messageChannelRepository.update({ id: messageChannel.id, workspaceId }, {
                pendingGroupEmailsAction: types_1.MessageChannelPendingGroupEmailsAction.NONE,
            });
            this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Reset pendingGroupEmailsAction to NONE`);
        }
        catch (error) {
            this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Error processing group email action: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleGroupEmailsDeletion(workspaceId, messageChannelId) {
        await this.messagingDeleteGroupEmailMessagesService.deleteGroupEmailMessages(workspaceId, messageChannelId);
        await this.resetCursors(workspaceId, messageChannelId);
        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed GROUP_EMAILS_DELETION action`);
    }
    async handleGroupEmailsImport(workspaceId, messageChannelId) {
        await this.resetCursors(workspaceId, messageChannelId);
        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannelId} - Completed GROUP_EMAILS_IMPORT action`);
    }
    async resetCursors(workspaceId, messageChannelId) {
        await this.messageChannelRepository.update({ id: messageChannelId, workspaceId }, { syncCursor: '' });
        await this.messageFolderRepository.update(workspaceId, { messageChannelId }, { syncCursor: '' });
    }
};
exports.MessagingProcessGroupEmailActionsService = MessagingProcessGroupEmailActionsService;
exports.MessagingProcessGroupEmailActionsService = MessagingProcessGroupEmailActionsService = MessagingProcessGroupEmailActionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __param(2, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeorm_2.Repository, typeof (_b = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _b : Object, messaging_delete_group_email_messages_service_1.MessagingDeleteGroupEmailMessagesService])
], MessagingProcessGroupEmailActionsService);
