"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageListFetchService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const lodash_chunk_1 = __importDefault(require("lodash.chunk"));
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const types_1 = require("kovaa-lab-shared/types");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const messaging_import_exception_handler_service_1 = require("src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service");
const filter_message_external_ids_to_delete_util_1 = require("src/modules/messaging/message-import-manager/utils/filter-message-external-ids-to-delete.util");
const ONE_WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;
let MessagingMessageListFetchService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingMessageListFetchService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingMessageListFetchService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
        logger = new common_1.Logger(MessagingMessageListFetchService.name);
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
                                messageExternalId: (0, typeorm_1.In)(messageExternalIdsChunk),
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
                        id: (0, typeorm_1.MoreThanOrEqual)(nextFirstBatchMessageChannelMessageAssociationId),
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
    return MessagingMessageListFetchService = _classThis;
})();
exports.MessagingMessageListFetchService = MessagingMessageListFetchService;
