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
exports.ImapGetAllFoldersService = void 0;
const common_1 = require("@nestjs/common");
const utils_1 = require("kovaa-lab-shared/utils");
const should_create_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-create-folder-by-default.util");
const should_sync_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-sync-folder-by-default.util");
const get_imap_folder_path_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/get-imap-folder-path.util");
const normalize_imap_unicode_util_1 = require("src/modules/messaging/message-import-manager/drivers/imap/utils/normalize-imap-unicode.util");
const get_standard_folder_by_regex_1 = require("src/modules/messaging/message-import-manager/drivers/utils/get-standard-folder-by-regex");
let ImapGetAllFoldersService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ImapGetAllFoldersService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ImapGetAllFoldersService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        imapClientProvider;
        imapFindSentFolderService;
        logger = new common_1.Logger(ImapGetAllFoldersService.name);
        constructor(imapClientProvider, imapFindSentFolderService) {
            this.imapClientProvider = imapClientProvider;
            this.imapFindSentFolderService = imapFindSentFolderService;
        }
        async getAllMessageFolders(connectedAccount, messageChannel, existingFolders) {
            try {
                const client = await this.imapClientProvider.getClient(connectedAccount.id);
                const mailboxList = await client.list();
                const folders = await this.filterAndMapFolders(client, mailboxList, messageChannel, existingFolders);
                await this.imapClientProvider.closeClient(client);
                return folders;
            }
            catch (error) {
                this.logger.error(`Failed to get IMAP folders for account ${connectedAccount.handle}:`, error);
                throw error;
            }
        }
        async filterAndMapFolders(client, mailboxList, messageChannel, existingFolders) {
            const normalizedMailboxList = mailboxList.map((mailbox) => ({
                ...mailbox,
                path: (0, normalize_imap_unicode_util_1.normalizeImapUnicode)(mailbox.path, client),
                name: (0, normalize_imap_unicode_util_1.normalizeImapUnicode)(mailbox.name, client),
                parentPath: mailbox.parentPath
                    ? (0, normalize_imap_unicode_util_1.normalizeImapUnicode)(mailbox.parentPath, client)
                    : mailbox.parentPath,
            }));
            const existingExternalIdsByNormalizedId = new Map();
            for (const folder of existingFolders) {
                if ((0, utils_1.isDefined)(folder.externalId)) {
                    existingExternalIdsByNormalizedId.set((0, normalize_imap_unicode_util_1.normalizeImapUnicode)(folder.externalId, client), folder.externalId);
                }
            }
            const folders = [];
            const pathToExternalIdMap = new Map();
            const sentFolder = await this.imapFindSentFolderService.findSentFolder(client);
            const sentFolderPath = (0, utils_1.isDefined)(sentFolder)
                ? (0, normalize_imap_unicode_util_1.normalizeImapUnicode)(sentFolder.path, client)
                : undefined;
            const sentMailbox = (0, utils_1.isDefined)(sentFolder)
                ? normalizedMailboxList.find((mailbox) => mailbox.path === sentFolderPath)
                : undefined;
            if ((0, utils_1.isDefined)(sentFolder) &&
                (0, utils_1.isDefined)(sentFolderPath) &&
                (0, utils_1.isDefined)(sentMailbox) &&
                this.isMailboxSelectable(sentMailbox)) {
                const uidValidity = await this.getUidValidity(client, sentMailbox);
                const normalizedExternalId = uidValidity
                    ? `${sentFolderPath}:${uidValidity.toString()}`
                    : sentFolderPath;
                const externalId = existingExternalIdsByNormalizedId.get(normalizedExternalId) ??
                    normalizedExternalId;
                pathToExternalIdMap.set(sentFolderPath, externalId);
                folders.push({
                    externalId,
                    name: sentMailbox.name,
                    isSynced: true,
                    isSentFolder: true,
                    parentFolderId: sentMailbox?.parentPath || null,
                });
            }
            for (const mailbox of normalizedMailboxList) {
                if (!this.isValidMailbox(client, mailbox, folders)) {
                    if (!pathToExternalIdMap.has(mailbox.path)) {
                        pathToExternalIdMap.set(mailbox.path, mailbox.path);
                    }
                    continue;
                }
                const uidValidity = await this.getUidValidity(client, mailbox);
                const normalizedExternalId = uidValidity
                    ? `${mailbox.path}:${uidValidity}`
                    : mailbox.path;
                const externalId = existingExternalIdsByNormalizedId.get(normalizedExternalId) ??
                    normalizedExternalId;
                pathToExternalIdMap.set(mailbox.path, externalId);
                const standardFolder = (0, get_standard_folder_by_regex_1.getStandardFolderByRegex)(mailbox.name);
                if (!(0, should_create_folder_by_default_util_1.shouldCreateFolderByDefault)(standardFolder)) {
                    continue;
                }
                const isSynced = (0, should_sync_folder_by_default_util_1.shouldSyncFolderByDefault)(messageChannel.messageFolderImportPolicy);
                folders.push({
                    externalId,
                    name: mailbox.name,
                    isSynced,
                    isSentFolder: false,
                    parentFolderId: mailbox.parentPath || null,
                });
            }
            for (const folder of folders) {
                if (folder.parentFolderId) {
                    const parentExternalId = pathToExternalIdMap.get(folder.parentFolderId);
                    folder.parentFolderId = parentExternalId || null;
                }
            }
            return folders;
        }
        isMailboxSelectable(mailbox) {
            // Per RFC 3501, IMAP attribute names are case-insensitive. Different
            // servers vary the spelling (Dovecot: \Noselect, Stalwart: \NoSelect),
            // so we compare lowercased to avoid attempting SELECT on a virtual
            // namespace placeholder, which the server would reject as NONEXISTENT.
            if (!mailbox.flags) {
                return true;
            }
            for (const flag of mailbox.flags) {
                if (flag.toLowerCase() === '\\noselect') {
                    return false;
                }
            }
            return true;
        }
        isValidMailbox(client, mailbox, existingFolders) {
            if (!this.isMailboxSelectable(mailbox)) {
                return false;
            }
            const isDuplicate = existingFolders.some((folder) => (0, get_imap_folder_path_util_1.getImapFolderPath)(folder.externalId, client) === mailbox.path);
            return !isDuplicate;
        }
        async getUidValidity(client, mailbox) {
            if (mailbox.status?.uidValidity) {
                return mailbox.status.uidValidity;
            }
            try {
                const status = await client.status(mailbox.path, {
                    uidValidity: true,
                });
                return status.uidValidity ?? null;
            }
            catch (error) {
                this.logger.warn(`Failed to get uidValidity for folder ${mailbox.path}:`, error);
                return null;
            }
        }
    };
    return ImapGetAllFoldersService = _classThis;
})();
exports.ImapGetAllFoldersService = ImapGetAllFoldersService;
