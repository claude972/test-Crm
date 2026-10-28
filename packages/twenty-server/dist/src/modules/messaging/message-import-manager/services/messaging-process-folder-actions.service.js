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
var MessagingProcessFolderActionsService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingProcessFolderActionsService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const types_1 = require("kovaa-lab-shared/types");
const messaging_delete_folder_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-delete-folder-messages.service");
const messaging_import_folder_messages_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-folder-messages.service");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let MessagingProcessFolderActionsService = MessagingProcessFolderActionsService_1 = class MessagingProcessFolderActionsService {
    workspaceOrmManager;
    messageFolderRepository;
    messagingDeleteFolderMessagesService;
    messagingImportFolderMessagesService;
    logger = new common_1.Logger(MessagingProcessFolderActionsService_1.name);
    constructor(workspaceOrmManager, messageFolderRepository, messagingDeleteFolderMessagesService, messagingImportFolderMessagesService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageFolderRepository = messageFolderRepository;
        this.messagingDeleteFolderMessagesService = messagingDeleteFolderMessagesService;
        this.messagingImportFolderMessagesService = messagingImportFolderMessagesService;
    }
    async processFolderActions(messageChannel, messageFolders, workspaceId) {
        const foldersWithPendingActions = messageFolders.filter((folder) => (0, utils_1.isDefined)(folder.pendingSyncAction) &&
            folder.pendingSyncAction !== types_1.MessageFolderPendingSyncAction.NONE);
        if (foldersWithPendingActions.length === 0) {
            return { messageExternalIdsToImport: [] };
        }
        this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Processing ${foldersWithPendingActions.length} folders with pending actions`);
        const messageExternalIdsToImport = new Set();
        const folderIdsToDelete = [];
        const processedFolderIds = [];
        const failedFolderIds = [];
        for (const folder of foldersWithPendingActions) {
            try {
                this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${folder.id} - Processing folder action: ${folder.pendingSyncAction}`);
                switch (folder.pendingSyncAction) {
                    case types_1.MessageFolderPendingSyncAction.FOLDER_DELETION: {
                        await this.messagingDeleteFolderMessagesService.deleteFolderMessages(workspaceId, messageChannel, folder);
                        folderIdsToDelete.push(folder.id);
                        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${folder.id} - Completed FOLDER_DELETION action`);
                        break;
                    }
                    case types_1.MessageFolderPendingSyncAction.FOLDER_IMPORT: {
                        const folderMessageExternalIdsToImport = await this.messagingImportFolderMessagesService.getFolderMessageIdsToImport(messageChannel, folder);
                        for (const messageExternalId of folderMessageExternalIdsToImport) {
                            messageExternalIdsToImport.add(messageExternalId);
                        }
                        this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${folder.id} - Completed FOLDER_IMPORT action`);
                        break;
                    }
                }
                processedFolderIds.push(folder.id);
            }
            catch (error) {
                this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id}, FolderId: ${folder.id} - Error processing folder action: ${error.message}`, error.stack);
                failedFolderIds.push({ folderId: folder.id, error });
            }
        }
        if (failedFolderIds.length > 0) {
            this.logger.warn(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Failed to process ${failedFolderIds.length} folders. They will be retried on next sync.`);
        }
        if (processedFolderIds.length > 0 || folderIdsToDelete.length > 0) {
            const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
            await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
                if (processedFolderIds.length > 0) {
                    await this.messageFolderRepository.update(workspaceId, { id: (0, typeorm_1.In)(processedFolderIds) }, { pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE });
                    this.logger.debug(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Reset pendingSyncAction to NONE for ${processedFolderIds.length} folders`);
                }
                if (folderIdsToDelete.length > 0) {
                    await this.messageFolderRepository.delete(workspaceId, {
                        id: (0, typeorm_1.In)(folderIdsToDelete),
                    });
                    this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Deleted ${folderIdsToDelete.length} folders`);
                }
            }, authContext, { lite: true });
        }
        return {
            messageExternalIdsToImport: [...messageExternalIdsToImport],
        };
    }
};
exports.MessagingProcessFolderActionsService = MessagingProcessFolderActionsService;
exports.MessagingProcessFolderActionsService = MessagingProcessFolderActionsService = MessagingProcessFolderActionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _b : Object, messaging_delete_folder_messages_service_1.MessagingDeleteFolderMessagesService,
        messaging_import_folder_messages_service_1.MessagingImportFolderMessagesService])
], MessagingProcessFolderActionsService);
