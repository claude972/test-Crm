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
var ImapGetMessageListService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const imap_client_provider_1 = require("src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider");
const imap_message_list_fetch_error_handler_service_1 = require("src/modules/messaging/message-import-manager/drivers/imap/services/imap-message-list-fetch-error-handler.service");
const imap_sync_service_1 = require("src/modules/messaging/message-import-manager/drivers/imap/services/imap-sync.service");
const create_sync_cursor_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/create-sync-cursor.util");
const extract_mailbox_state_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/extract-mailbox-state.util");
const get_imap_folder_path_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/get-imap-folder-path.util");
const is_imap_mailbox_not_found_error_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/is-imap-mailbox-not-found-error.util");
const normalize_imap_unicode_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/normalize-imap-unicode.util");
const parse_sync_cursor_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/parse-sync-cursor.util");
let ImapGetMessageListService = ImapGetMessageListService_1 = class ImapGetMessageListService {
    imapClientProvider;
    imapSyncService;
    errorHandler;
    logger = new common_1.Logger(ImapGetMessageListService_1.name);
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
exports.ImapGetMessageListService = ImapGetMessageListService;
exports.ImapGetMessageListService = ImapGetMessageListService = ImapGetMessageListService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [imap_client_provider_1.ImapClientProvider, typeof (_a = typeof imap_sync_service_1.ImapSyncService !== "undefined" && imap_sync_service_1.ImapSyncService) === "function" ? _a : Object, typeof (_b = typeof imap_message_list_fetch_error_handler_service_1.ImapMessageListFetchErrorHandler !== "undefined" && imap_message_list_fetch_error_handler_service_1.ImapMessageListFetchErrorHandler) === "function" ? _b : Object])
], ImapGetMessageListService);
