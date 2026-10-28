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
var MessagingMessageListFetchService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageListFetchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_2 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const cache_storage_decorator_1 = require("src/engine/core-modules/cache-storage/decorators/cache-storage.decorator");
const cache_storage_service_1 = require("src/engine/core-modules/cache-storage/services/cache-storage.service");
const cache_storage_namespace_enum_1 = require("src/engine/core-modules/cache-storage/types/cache-storage-namespace.enum");
const workspace_orm_manager_1 = require("src/engine/kovaa-lab-orm/workspace-orm.manager");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const message_channel_sync_status_service_1 = require("src/modules/messaging/common/services/message-channel-sync-status.service");
const messaging_message_cleaner_service_1 = require("src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service");
const sync_message_folders_service_1 = require("src/modules/messaging/message-folder-manager/services/sync-message-folders.service");
const messaging_cursor_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-cursor.service");
const messaging_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-get-message-list.service");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const messaging_messages_import_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-messages-import.service");
const messaging_process_folder_actions_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-process-folder-actions.service");
const messaging_process_group_email_actions_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-process-group-email-actions.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const filter_message_external_ids_to_delete_util_1 = require("src/modules/messaging/message-import-manager/utils/filter-message-external-ids-to-delete.util");
const ONE_WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
let MessagingMessageListFetchService = MessagingMessageListFetchService_1 = class MessagingMessageListFetchService {
    cacheStorage;
    messageChannelSyncStatusService;
    workspaceOrmManager;
    messageChannelRepository;
    messagingGetMessageListService;
    messageImportErrorHandlerService;
    messagingMessageCleanerService;
    messagingCursorService;
    messagingMessagesImportService;
    syncMessageFoldersService;
    messagingProcessGroupEmailActionsService;
    messagingProcessFolderActionsService;
    logger = new common_1.Logger(MessagingMessageListFetchService_1.name);
    constructor(cacheStorage, messageChannelSyncStatusService, workspaceOrmManager, messageChannelRepository, messagingGetMessageListService, messageImportErrorHandlerService, messagingMessageCleanerService, messagingCursorService, messagingMessagesImportService, syncMessageFoldersService, messagingProcessGroupEmailActionsService, messagingProcessFolderActionsService) {
        this.cacheStorage = cacheStorage;
        this.messageChannelSyncStatusService = messageChannelSyncStatusService;
        this.workspaceOrmManager = workspaceOrmManager;
        this.messageChannelRepository = messageChannelRepository;
        this.messagingGetMessageListService = messagingGetMessageListService;
        this.messageImportErrorHandlerService = messageImportErrorHandlerService;
        this.messagingMessageCleanerService = messagingMessageCleanerService;
        this.messagingCursorService = messagingCursorService;
        this.messagingMessagesImportService = messagingMessagesImportService;
        this.syncMessageFoldersService = syncMessageFoldersService;
        this.messagingProcessGroupEmailActionsService = messagingProcessGroupEmailActionsService;
        this.messagingProcessFolderActionsService = messagingProcessFolderActionsService;
    }
    async processMessageListFetch(messageChannel, workspaceId) {
        const authContext = (0, build_system_auth_context_util_1.buildSystemAuthContext)(workspaceId);
        await this.workspaceOrmManager.executeInWorkspaceContext(async () => {
            try {
                const pendingGroupEmailActionsProcessed = await this.processPendingGroupEmailActions(messageChannel, workspaceId);
                const processedfolderActionsResult = await this.processPendingFolderActions(messageChannel, workspaceId);
                await this.messageChannelSyncStatusService.markAsMessagesListFetchOngoing([messageChannel.id], workspaceId);
                this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Processing message list fetch`);
                const freshMessageChannel = pendingGroupEmailActionsProcessed ||
                    (0, utils_1.isDefined)(processedfolderActionsResult)
                    ? await this.messageChannelRepository.findOne({
                        where: {
                            id: messageChannel.id,
                            workspaceId,
                        },
                        relations: { connectedAccount: true, messageFolders: true },
                    })
                    : messageChannel;
                if (!(0, utils_1.isDefined)(freshMessageChannel)) {
                    this.logger.error(`WorkspaceId: ${workspaceId}, MessageChannelId: ${messageChannel.id} - Message channel not found`);
                    return;
                }
                const messageFolders = await this.syncMessageFoldersService.syncMessageFolders({
                    messageChannel: freshMessageChannel,
                    workspaceId,
                });
                const messageFoldersToSync = messageFolders.filter((folder) => folder.pendingSyncAction === types_1.MessageFolderPendingSyncAction.NONE);
                const messageLists = await this.messagingGetMessageListService.getMessageLists(freshMessageChannel, messageFoldersToSync);
                await this.cacheStorage.mdel([
                    `messages-to-import:${workspaceId}:${freshMessageChannel.id}`,
                    `messages-to-import-total:${workspaceId}:${freshMessageChannel.id}`,
                    `messages-imported:${workspaceId}:${freshMessageChannel.id}`,
                ]);
                const messageExternalIds = [
                    ...messageLists.flatMap((messageList) => messageList.messageExternalIds),
                    ...(processedfolderActionsResult?.messageExternalIdsToImport ?? []),
                ];
                const messageExternalIdsToDelete = messageLists.flatMap((messageList) => messageList.messageExternalIdsToDelete);
                const isFullSync = messageLists.every((messageList) => !(0, guards_1.isNonEmptyString)(messageList.previousSyncCursor)) && !(0, guards_1.isNonEmptyString)(freshMessageChannel.syncCursor);
                let totalMessagesToImportCount = 0;
                this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${freshMessageChannel.id} - Is full sync: ${isFullSync}, toImportCount: ${messageExternalIds.length}, toDeleteCount: ${messageExternalIdsToDelete.length}`);
                const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
                const messageExternalIdsChunks = (0, lodash_chunk_1.default)(messageExternalIds, 200);
                for (const [index, messageExternalIdsChunk,] of messageExternalIdsChunks.entries()) {
                    const existingMessageChannelMessageAssociations = await messageChannelMessageAssociationRepository.find({
                        where: {
                            messageChannelId: freshMessageChannel.id,
                            messageExternalId: (0, typeorm_2.In)(messageExternalIdsChunk),
                        },
                    });
                    const existingMessageChannelMessageAssociationsExternalIds = existingMessageChannelMessageAssociations.map((messageChannelMessageAssociation) => messageChannelMessageAssociation.messageExternalId);
                    const messageExternalIdsToImport = messageExternalIdsChunk.filter((messageExternalId) => !existingMessageChannelMessageAssociationsExternalIds.includes(messageExternalId));
                    if (messageExternalIdsToImport.length) {
                        this.logger.debug(`messageChannelId: ${freshMessageChannel.id} Adding ${messageExternalIdsToImport.length} message external ids to import in batch ${index + 1}`);
                        totalMessagesToImportCount += messageExternalIdsToImport.length;
                        await this.cacheStorage.setAdd(`messages-to-import:${workspaceId}:${freshMessageChannel.id}`, messageExternalIdsToImport, ONE_WEEK_IN_MILLISECONDS);
                    }
                }
                for (const messageList of messageLists) {
                    const { nextSyncCursor, folderId } = messageList;
                    await this.messagingCursorService.updateCursor(freshMessageChannel, nextSyncCursor, workspaceId, folderId);
                }
                const fullSyncMessageChannelMessageAssociationsToDelete = isFullSync
                    ? await this.computeFullSyncMessageChannelMessageAssociationsToDelete(freshMessageChannel, messageExternalIds)
                    : [];
                const allMessageExternalIdsToDelete = (0, filter_message_external_ids_to_delete_util_1.filterMessageExternalIdsToDelete)({
                    messageExternalIds,
                    messageExternalIdsToDelete: [
                        ...messageExternalIdsToDelete,
                        ...fullSyncMessageChannelMessageAssociationsToDelete.map((messageChannelMessageAssociation) => messageChannelMessageAssociation.messageExternalId),
                    ],
                });
                if (allMessageExternalIdsToDelete.length) {
                    this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${freshMessageChannel.id} - Deleting ${allMessageExternalIdsToDelete.length} message channel message associations`);
                    const toDeleteChunks = (0, lodash_chunk_1.default)(allMessageExternalIdsToDelete, 200);
                    for (const [index, toDeleteChunk] of toDeleteChunks.entries()) {
                        this.logger.debug(`messageChannelId: ${freshMessageChannel.id} Deleting ${toDeleteChunk.length} message channel message associations in batch ${index + 1}`);
                        await this.messagingMessageCleanerService.deleteMessagesChannelMessageAssociationsAndRelatedOrphans({
                            workspaceId,
                            messageExternalIds: toDeleteChunk,
                            messageChannelId: freshMessageChannel.id,
                        });
                    }
                }
                this.logger.log(`WorkspaceId: ${workspaceId}, MessageChannelId: ${freshMessageChannel.id} - Total messages to import count: ${totalMessagesToImportCount}`);
                if (totalMessagesToImportCount === 0) {
                    await this.messageChannelSyncStatusService.markAsMessageSyncCompleted([freshMessageChannel.id], workspaceId);
                    return;
                }
                await this.cacheStorage.set(`messages-to-import-total:${workspaceId}:${freshMessageChannel.id}`, await this.cacheStorage.getSetLength(`messages-to-import:${workspaceId}:${freshMessageChannel.id}`), ONE_WEEK_IN_MILLISECONDS);
                await this.cacheStorage.set(`messages-imported:${workspaceId}:${freshMessageChannel.id}`, 0, ONE_WEEK_IN_MILLISECONDS);
                this.logger.debug(`messageChannelId: ${freshMessageChannel.id} Scheduling direct messages import`);
                await this.messageChannelSyncStatusService.markAsMessagesImportScheduled([freshMessageChannel.id], workspaceId);
                await this.messagingMessagesImportService.processMessageBatchImport({
                    ...freshMessageChannel,
                    syncStage: types_1.MessageChannelSyncStage.MESSAGES_IMPORT_SCHEDULED,
                }, freshMessageChannel.connectedAccount, workspaceId);
            }
            catch (error) {
                await this.messageImportErrorHandlerService.handleDriverException(error, messaging_import_exception_handler_service_1.MessageImportSyncStep.MESSAGE_LIST_FETCH, messageChannel, workspaceId);
            }
        }, authContext, { lite: true });
    }
    async processPendingGroupEmailActions(messageChannel, workspaceId) {
        const hasPendingGroupEmailAction = messageChannel.pendingGroupEmailsAction ===
            types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_DELETION ||
            messageChannel.pendingGroupEmailsAction ===
                types_1.MessageChannelPendingGroupEmailsAction.GROUP_EMAILS_IMPORT;
        if (!hasPendingGroupEmailAction) {
            return false;
        }
        this.logger.log(`messageChannelId: ${messageChannel.id} Processing pending group emails action before message list fetch: ${messageChannel.pendingGroupEmailsAction}`);
        await this.messagingProcessGroupEmailActionsService.processGroupEmailActions(messageChannel, workspaceId);
        return true;
    }
    async processPendingFolderActions(messageChannel, workspaceId) {
        const foldersWithPendingActions = messageChannel.messageFolders.filter((folder) => (0, utils_1.isDefined)(folder.pendingSyncAction) &&
            folder.pendingSyncAction !== types_1.MessageFolderPendingSyncAction.NONE);
        if (foldersWithPendingActions.length === 0) {
            return null;
        }
        this.logger.log(`messageChannelId: ${messageChannel.id} Processing pending folder actions before message list fetch`);
        return this.messagingProcessFolderActionsService.processFolderActions(messageChannel, foldersWithPendingActions, workspaceId);
    }
    async computeFullSyncMessageChannelMessageAssociationsToDelete(messageChannel, messageExternalIds) {
        const messageChannelMessageAssociationRepository = this.workspaceOrmManager.getRepository('messageChannelMessageAssociation', { shouldBypassPermissionChecks: true });
        const fullSyncMessageChannelMessageAssociationsToDelete = [];
        // Set lookup keeps the per-row diff O(1): mailboxes reach 1M+ associations,
        // so an Array.includes here is O(existing * total) and blocks the worker loop.
        const messageExternalIdSet = new Set(messageExternalIds);
        const firstMessageChannelMessageAssociation = await messageChannelMessageAssociationRepository.findOne({
            where: {
                messageChannelId: messageChannel.id,
            },
            order: {
                id: 'ASC',
            },
        });
        if (!(0, utils_1.isDefined)(firstMessageChannelMessageAssociation)) {
            this.logger.log(`messageChannelId: ${messageChannel.id} Full sync: No message channel message associations found`);
            return [];
        }
        this.logger.log(`messageChannelId: ${messageChannel.id} Full sync: First message channel message association id: ${firstMessageChannelMessageAssociation.id}`);
        let nextFirstBatchMessageChannelMessageAssociationId = firstMessageChannelMessageAssociation.id;
        let batchIndex = 0;
        while ((0, utils_1.isDefined)(nextFirstBatchMessageChannelMessageAssociationId)) {
            const existingMessageChannelMessageAssociations = await messageChannelMessageAssociationRepository.find({
                where: {
                    messageChannelId: messageChannel.id,
                    id: (0, typeorm_2.MoreThanOrEqual)(nextFirstBatchMessageChannelMessageAssociationId),
                },
                order: {
                    id: 'ASC',
                },
                take: 200,
            });
            const messageChannelMessageAssociationsToDelete = existingMessageChannelMessageAssociations.filter((existingMessageChannelMessageAssociation) => (0, utils_1.isDefined)(existingMessageChannelMessageAssociation.messageExternalId) &&
                !messageExternalIdSet.has(existingMessageChannelMessageAssociation.messageExternalId));
            this.logger.log(`messageChannelId: ${messageChannel.id} Full sync: Message channel message associations to delete in batch ${batchIndex}: ${messageChannelMessageAssociationsToDelete.length}`);
            fullSyncMessageChannelMessageAssociationsToDelete.push(...messageChannelMessageAssociationsToDelete);
            if (existingMessageChannelMessageAssociations.length < 200) {
                nextFirstBatchMessageChannelMessageAssociationId = undefined;
                break;
            }
            nextFirstBatchMessageChannelMessageAssociationId =
                existingMessageChannelMessageAssociations[existingMessageChannelMessageAssociations.length - 1].id;
            batchIndex++;
        }
        return fullSyncMessageChannelMessageAssociationsToDelete;
    }
};
exports.MessagingMessageListFetchService = MessagingMessageListFetchService;
exports.MessagingMessageListFetchService = MessagingMessageListFetchService = MessagingMessageListFetchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, cache_storage_decorator_1.InjectCacheStorage)(cache_storage_namespace_enum_1.CacheStorageNamespace.ModuleMessaging)),
    __param(3, (0, typeorm_1.InjectRepository)(message_channel_entity_1.MessageChannelEntity)),
    __metadata("design:paramtypes", [typeof (_a = typeof cache_storage_service_1.CacheStorageService !== "undefined" && cache_storage_service_1.CacheStorageService) === "function" ? _a : Object, message_channel_sync_status_service_1.MessageChannelSyncStatusService, typeof (_b = typeof workspace_orm_manager_1.WorkspaceOrmManager !== "undefined" && workspace_orm_manager_1.WorkspaceOrmManager) === "function" ? _b : Object, typeorm_2.Repository,
        messaging_get_message_list_service_1.MessagingGetMessageListService,
        messaging_import_exception_handler_service_1.MessageImportExceptionHandlerService,
        messaging_message_cleaner_service_1.MessagingMessageCleanerService,
        messaging_cursor_service_1.MessagingCursorService,
        messaging_messages_import_service_1.MessagingMessagesImportService,
        sync_message_folders_service_1.SyncMessageFoldersService,
        messaging_process_group_email_actions_service_1.MessagingProcessGroupEmailActionsService,
        messaging_process_folder_actions_service_1.MessagingProcessFolderActionsService])
], MessagingMessageListFetchService);
