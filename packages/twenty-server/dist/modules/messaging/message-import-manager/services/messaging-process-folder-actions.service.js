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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingProcessFolderActionsService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const types_1 = require("kovaa-lab-shared/types");
let MessagingProcessFolderActionsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MessagingProcessFolderActionsService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MessagingProcessFolderActionsService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        workspaceOrmManager;
        messageFolderRepository;
        messagingDeleteFolderMessagesService;
        messagingImportFolderMessagesService;
        logger = new common_1.Logger(MessagingProcessFolderActionsService.name);
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
    return MessagingProcessFolderActionsService = _classThis;
})();
exports.MessagingProcessFolderActionsService = MessagingProcessFolderActionsService;
