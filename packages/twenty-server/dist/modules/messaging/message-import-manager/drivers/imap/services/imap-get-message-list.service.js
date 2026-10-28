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
exports.ImapGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const create_sync_cursor_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/create-sync-cursor.util");
const extract_mailbox_state_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/extract-mailbox-state.util");
const get_imap_folder_path_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/get-imap-folder-path.util");
const is_imap_mailbox_not_found_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/is-imap-mailbox-not-found-error.util");
const normalize_imap_unicode_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/normalize-imap-unicode.util");
const parse_sync_cursor_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-sync-cursor.util");
let ImapGetMessageListService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ImapGetMessageListService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ImapGetMessageListService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        imapClientProvider;
        imapSyncService;
        errorHandler;
        logger = new common_1.Logger(ImapGetMessageListService.name);
        constructor(imapClientProvider, imapSyncService, errorHandler) {
            this.imapClientProvider = imapClientProvider;
            this.imapSyncService = imapSyncService;
            this.errorHandler = errorHandler;
        }
        async getMessageLists({ connectedAccount, messageFolders, messageChannel, }) {
            const foldersToProcess = messageChannel.messageFolderImportPolicy ===
                types_1.MessageFolderImportPolicy.SELECTED_FOLDERS
                ? messageFolders.filter((folder) => folder.isSynced)
                : messageFolders;
            if (foldersToProcess.length === 0) {
                this.logger.warn(`Connected account ${connectedAccount.id}: No folders to process`);
                return [];
            }
            const client = await this.imapClientProvider.getClient(connectedAccount.id);
            try {
                const results = [];
                for (const folder of foldersToProcess) {
                    try {
                        const response = await this.getMessageList(client, folder);
                        results.push({ ...response, folderId: folder.id });
                    }
                    catch (error) {
                        if ((0, is_imap_mailbox_not_found_error_util_1.isImapMailboxNotFoundError)(error)) {
                            this.logger.warn(`Skipping unavailable mailbox for folder ${folder.name}`);
                            continue;
                        }
                        throw error;
                    }
                }
                return results;
            }
            catch (error) {
                this.logger.error(`Connected account ${connectedAccount.id}: Error fetching message list: ${error.message}`);
                this.errorHandler.handleError(error);
                throw error;
            }
            finally {
                await this.imapClientProvider.closeClient(client);
            }
        }
        async getMessageList(client, folder) {
            const messageExternalIdPrefix = (0, get_imap_folder_path_util_1.getImapFolderPath)(folder.externalId);
            if (!(0, utils_1.isDefined)(messageExternalIdPrefix)) {
                throw new message_import_driver_exception_1.MessageImportDriverException(`Folder ${folder.name} has no path`, message_import_driver_exception_1.MessageImportDriverExceptionCode.NOT_FOUND);
            }
            const folderPath = (0, normalize_imap_unicode_util_1.normalizeImapUnicode)(messageExternalIdPrefix, client);
            if (await this.canSkipFolderSync(client, folder)) {
                this.logger.log(`Skipping folder ${folder.name}: no new messages`);
                return {
                    messageExternalIds: [],
                    messageExternalIdsToDelete: [],
                    nextSyncCursor: folder.syncCursor ?? '',
                    previousSyncCursor: folder.syncCursor,
                    folderId: folder.id,
                };
            }
            this.logger.log(`Processing folder: ${folder.name}`);
            const previousCursor = (0, parse_sync_cursor_util_1.parseSyncCursor)(folder.syncCursor);
            const lock = await client.getMailboxLock(folderPath);
            try {
                const mailbox = client.mailbox;
                if (!mailbox || typeof mailbox === 'boolean') {
                    throw new message_import_driver_exception_1.MessageImportDriverException(`Invalid mailbox state for folder ${folderPath}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.UNKNOWN);
                }
                const mailboxState = await (0, extract_mailbox_state_util_1.resolveMailboxState)(client, folderPath, mailbox);
                const { messageUids } = await this.imapSyncService.syncFolder(client, folderPath, previousCursor, mailboxState);
                const nextCursor = (0, create_sync_cursor_util_1.createSyncCursor)(messageUids, previousCursor, mailboxState);
                const messageExternalIds = messageUids
                    .sort((a, b) => b - a)
                    .map((uid) => `${messageExternalIdPrefix}:${uid}`);
                return {
                    messageExternalIds,
                    messageExternalIdsToDelete: [],
                    nextSyncCursor: JSON.stringify(nextCursor),
                    previousSyncCursor: folder.syncCursor,
                    folderId: folder.id,
                };
            }
            catch (error) {
                if ((0, is_imap_mailbox_not_found_error_util_1.isImapMailboxNotFoundError)(error)) {
                    throw error;
                }
                this.logger.error(`Error syncing folder ${folder.name}: ${error.message}`);
                this.errorHandler.handleError(error);
                throw error;
            }
            finally {
                lock.release();
            }
        }
        async canSkipFolderSync(client, folder) {
            const folderPath = (0, get_imap_folder_path_util_1.getImapFolderPath)(folder.externalId, client);
            const previousCursor = (0, parse_sync_cursor_util_1.parseSyncCursor)(folder.syncCursor);
            if (!(0, utils_1.isDefined)(folderPath) || !(0, utils_1.isDefined)(previousCursor)) {
                return false;
            }
            try {
                const supportsCondstore = client.capabilities.has('CONDSTORE');
                const status = await client.status(folderPath, {
                    uidNext: true,
                    uidValidity: true,
                    ...(supportsCondstore && { highestModseq: true }),
                });
                if (!(0, utils_1.isDefined)(status.uidValidity)) {
                    this.logger.debug(`Folder ${folderPath}: Server missing UIDVALIDITY. Sync required.`);
                    return false;
                }
                if (!(0, utils_1.isDefined)(status.uidNext)) {
                    this.logger.debug(`Folder ${folderPath}: Server missing UIDNEXT. Sync required.`);
                    return false;
                }
                const uidNext = Number(status.uidNext);
                const uidValidity = Number(status.uidValidity);
                if (previousCursor.uidValidity !== uidValidity) {
                    this.logger.debug(`Folder ${folderPath}: UIDVALIDITY changed (${previousCursor.uidValidity} → ${uidValidity}). Full sync required.`);
                    return false;
                }
                const hasModSeqChanged = (0, utils_1.isDefined)(previousCursor.modSeq) &&
                    (0, utils_1.isDefined)(status.highestModseq) &&
                    previousCursor.modSeq !== status.highestModseq.toString();
                if (hasModSeqChanged) {
                    this.logger.debug(`Folder ${folderPath}: MODSEQ changed (${previousCursor.modSeq} → ${status.highestModseq}). Sync required.`);
                    return false;
                }
                const maxUid = Math.max(0, uidNext - 1);
                return previousCursor.highestUid >= maxUid;
            }
            catch (error) {
                this.logger.warn(`Failed to get status for folder ${folderPath}: ${error.message}`);
                return false;
            }
        }
    };
    return ImapGetMessageListService = _classThis;
})();
exports.ImapGetMessageListService = ImapGetMessageListService;
