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
exports.SyncMessageFoldersService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const typeorm_1 = require("typeorm");
const build_system_auth_context_util_1 = require("src/engine/kovaa-lab-orm/utils/build-system-auth-context.util");
const compute_folder_ids_to_delete_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folder-ids-to-delete.util");
const compute_folders_to_create_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-create.util");
const compute_folders_to_update_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-folders-to-update.util");
const compute_updated_folders_util_1 = require("src/modules/messaging/message-folder-manager/utils/compute-updated-folders.util");
let SyncMessageFoldersService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var SyncMessageFoldersService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            SyncMessageFoldersService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return SyncMessageFoldersService = _classThis;
})();
exports.SyncMessageFoldersService = SyncMessageFoldersService;
