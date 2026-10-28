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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncMessageFoldersService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const gmail_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-get-all-folders.service");
const imap_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/imap/services/imap-get-all-folders.service");
const microsoft_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/microsoft/services/microsoft-get-all-folders.service");
const compute_folder_ids_to_delete_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folder-ids-to-delete.util");
const compute_folders_to_create_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-create.util");
const compute_folders_to_update_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-update.util");
const compute_updated_folders_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-updated-folders.util");
const inject_workspace_scoped_repository_decorator_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator");
const workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository");
let SyncMessageFoldersService = class SyncMessageFoldersService {
    workspaceOrmManager;
    messageFolderRepository;
    gmailGetAllFoldersService;
    microsoftGetAllFoldersService;
    imapGetAllFoldersService;
    constructor(workspaceOrmManager, messageFolderRepository, gmailGetAllFoldersService, microsoftGetAllFoldersService, imapGetAllFoldersService) {
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageFolderRepository = messageFolderRepository;
        this.gmailGetAllFoldersService = gmailGetAllFoldersService;
        this.microsoftGetAllFoldersService = microsoftGetAllFoldersService;
        this.imapGetAllFoldersService = imapGetAllFoldersService;
    }
    async syncMessageFolders({ messageChannel, workspaceId, }) {
        const discoveredFolders = await this.discoverAllFolders(messageChannel.connectedAccount, messageChannel, messageChannel.messageFolders);
        const { messageFolders: existingFolders, id: messageChannelId } = messageChannel;
        return this.syncFolderChanges(discoveredFolders, existingFolders, messageChannelId, workspaceId);
    }
    async discoverAllFolders(connectedAccount, messageChannel, existingFolders) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.gmailGetAllFoldersService.getAllMessageFolders(connectedAccount, messageChannel);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftGetAllFoldersService.getAllMessageFolders(connectedAccount, messageChannel);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.imapGetAllFoldersService.getAllMessageFolders(connectedAccount, messageChannel, existingFolders);
            default:
                throw new Error(`Provider ${connectedAccount.provider} is not supported`);
        }
    }
    async syncFolderChanges(discoveredFolders, existingFolders, messageChannelId, workspaceId) {
        const foldersToCreate = (0, compute_folders_to_create_util_1.computeFoldersToCreate)({
            discoveredFolders,
            existingFolders,
            messageChannelId,
        });
        const foldersToUpdate = (0, compute_folders_to_update_util_1.computeFoldersToUpdate)({
            discoveredFolders,
            existingFolders,
        });
        const folderIdsToDelete = (0, compute_folder_ids_to_delete_util_1.computeFolderIdsToDelete)({
            discoveredFolders,
            existingFolders,
        });
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            if (folderIdsToDelete.length > 0) {
                await this.messageFolderRepository.update(workspaceId, { id: (0, typeorm_1.In)(folderIdsToDelete) }, {
                    pendingSyncAction: types_1.MessageFolderPendingSyncAction.FOLDER_DELETION,
                });
            }
            if (foldersToUpdate.size > 0) {
                for (const [id, data] of foldersToUpdate.entries()) {
                    await this.messageFolderRepository.update(workspaceId, { id, messageChannelId }, data);
                }
            }
            if (foldersToCreate.length > 0) {
                for (const folderToCreate of foldersToCreate) {
                    await this.messageFolderRepository.insert(workspaceId, folderToCreate);
                }
            }
            const createdFolders = foldersToCreate.length > 0
                ? await this.messageFolderRepository.find(workspaceId, {
                    where: {
                        messageChannelId,
                        externalId: (0, typeorm_1.In)(foldersToCreate
                            .map((folder) => folder.externalId)
                            .filter(utils_1.isDefined)),
                    },
                })
                : [];
            const updatedExistingFolders = (0, compute_updated_folders_util_1.computeUpdatedFolders)({
                existingFolders,
                foldersToUpdate,
                folderIdsToDelete,
            });
            return [...updatedExistingFolders, ...createdFolders];
        }, authContext, { lite: true });
    }
};
exports.SyncMessageFoldersService = SyncMessageFoldersService;
exports.SyncMessageFoldersService = SyncMessageFoldersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, inject_workspace_scoped_repository_decorator_1.InjectWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _a : Object, typeof (_b = typeof workspace_scoped_repository_1.WorkspaceScopedRepository !== "undefined" && workspace_scoped_repository_1.WorkspaceScopedRepository) === "function" ? _b : Object, typeof (_c = typeof gmail_get_all_folders_service_1.GmailGetAllFoldersService !== "undefined" && gmail_get_all_folders_service_1.GmailGetAllFoldersService) === "function" ? _c : Object, microsoft_get_all_folders_service_1.MicrosoftGetAllFoldersService,
        imap_get_all_folders_service_1.ImapGetAllFoldersService])
], SyncMessageFoldersService);
