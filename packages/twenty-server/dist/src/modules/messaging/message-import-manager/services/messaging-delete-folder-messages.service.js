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
var MessagingDeleteFolderMessagesService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingDeleteFolderMessagesService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
const BATCH_SIZE = 200;
let MessagingDeleteFolderMessagesService = MessagingDeleteFolderMessagesService_1 = class MessagingDeleteFolderMessagesService {
    messagingMessageCleanerService;
    workspaceOrmManager;
    logger = new common_1.Logger(MessagingDeleteFolderMessagesService_1.name);
    constructor(messagingMessageCleanerService, workspaceOrmManager) {
        this.messagingMessageCleanerService = messagingMessageCleanerService;
        this.workspaceOrmManager = workspaceOrmManager;
    }
    async deleteFolderMessages(workspaceId, messageChannel, messageFolder) {
        this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${messageFolder.id} - Deleting messages from folder: ${messageFolder.name}`);
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        let totalDeletedCount = 0;
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            const messageFolderAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociationMessageFolder', { shouldBypassPermissionChecks: true });
            const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
            let hasMoreData = true;
            while (hasMoreData) {
                const folderAssociations = await messageFolderAssociationRepository.find({
                    where: {
                        messageFolderId: messageFolder.id,
                    },
                    take: BATCH_SIZE,
                });
                if (folderAssociations.length === 0) {
                    hasMoreData = false;
                    continue;
                }
                const folderAssociationIds = folderAssociations.map((folderAssociation) => folderAssociation.id);
                const messageChannelMessageAssociationIds = folderAssociations.map((folderAssociation) => folderAssociation.messageChannelMessageAssociationId);
                const associations = await messageChannelMessageAssociationRepository.find({
                    where: {
                        id: (0, typeorm_1.In)(messageChannelMessageAssociationIds),
                        messageChannelId: messageChannel.id,
                    },
                });
                const messageExternalIds = associations
                    .map((association) => association.messageExternalId)
                    .filter(utils_1.isDefined);
                this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${messageFolder.id} - Deleting ${messageExternalIds.length} messages`);
                if (messageExternalIds.length > 0) {
                    await this.messagingMessageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
                        workspaceId,
                        messageExternalIds,
                        messageChannelId: messageChannel.id,
                    });
                    totalDeletedCount += messageExternalIds.length;
                }
                await messageFolderAssociationRepository.delete({
                    id: (0, typeorm_1.In)(folderAssociationIds),
                });
            }
        }, authContext, { lite: true });
        this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${messageFolder.id} - Completed deleting ${totalDeletedCount} messages from folder: ${messageFolder.name}`);
        return totalDeletedCount;
    }
};
exports.MessagingDeleteFolderMessagesService = MessagingDeleteFolderMessagesService;
exports.MessagingDeleteFolderMessagesService = MessagingDeleteFolderMessagesService = MessagingDeleteFolderMessagesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [messaging_message_cleaner_service_1.MessagingMessageCleanerService, typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object])
], MessagingDeleteFolderMessagesService);
