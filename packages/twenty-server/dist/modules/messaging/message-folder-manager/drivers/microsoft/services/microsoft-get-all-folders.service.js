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
exports.MicrosoftGetAllFoldersService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const utils_1 = require("kovaa-lab-shared/utils");
const should_create_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-create-folder-by-default.util");
const should_sync_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-sync-folder-by-default.util");
const standard_folder_type_1 = require("src/modules/messaging/message-import-manager/drivers/types/standard-folder.type");
const get_standard_folder_by_regex_1 = require("src/modules/messaging/message-import-manager/drivers/utils/get-standard-folder-by-regex");
const MESSAGING_MICROSOFT_MAIL_FOLDERS_LIST_MAX_RESULT = 999;
let MicrosoftGetAllFoldersService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MicrosoftGetAllFoldersService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MicrosoftGetAllFoldersService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        microsoftOAuth2ClientProvider;
        microsoftMessageListFetchErrorHandler;
        logger = new common_1.Logger(MicrosoftGetAllFoldersService.name);
        constructor(microsoftOAuth2ClientProvider, microsoftMessageListFetchErrorHandler) {
            this.microsoftOAuth2ClientProvider = microsoftOAuth2ClientProvider;
            this.microsoftMessageListFetchErrorHandler = microsoftMessageListFetchErrorHandler;
        }
        async getAllMessageFolders(connectedAccount, messageChannel) {
            try {
                const microsoftClient = await this.microsoftOAuth2ClientProvider.getClient(connectedAccount.id);
                const firstPage = await microsoftClient
                    .api('/me/mailFolders')
                    .version('beta')
                    .top(MESSAGING_MICROSOFT_MAIL_FOLDERS_LIST_MAX_RESULT)
                    .get()
                    .catch((error) => {
                    this.logger.error(`Connected account ${connectedAccount.id}: Error fetching folders: ${error.message}`);
                    return this.microsoftMessageListFetchErrorHandler.handleError(error);
                });
                const folders = [];
                const callback = (folder) => {
                    folders.push(folder);
                    return true;
                };
                const pageIterator = new microsoft_graph_client_1.PageIterator(microsoftClient, firstPage, callback);
                await pageIterator.iterate().catch((error) => {
                    this.microsoftMessageListFetchErrorHandler.handleError(error);
                });
                const rootFolderId = this.getRootFolderId(folders);
                const folderInfos = [];
                for (const folder of folders) {
                    if (!folder.displayName) {
                        continue;
                    }
                    const standardFolder = folder.wellKnownName
                        ? (0, get_standard_folder_by_regex_1.getStandardFolderByRegex)(folder.wellKnownName)
                        : null;
                    if (!(0, should_create_folder_by_default_util_1.shouldCreateFolderByDefault)(standardFolder)) {
                        continue;
                    }
                    const isSentFolder = this.isSentFolder(standardFolder);
                    const isSynced = (0, should_sync_folder_by_default_util_1.shouldSyncFolderByDefault)(messageChannel.messageFolderImportPolicy);
                    folderInfos.push({
                        externalId: folder.id,
                        name: folder.displayName,
                        isSynced,
                        isSentFolder,
                        parentFolderId: this.getParentFolderId(folder.parentFolderId, rootFolderId),
                    });
                }
                this.logger.debug(`Found ${folderInfos.length} folders for Microsoft account ${connectedAccount.handle}`);
                return folderInfos;
            }
            catch (error) {
                this.logger.error(`Failed to get Microsoft folders for account ${connectedAccount.handle}:`, error);
                throw error;
            }
        }
        isSentFolder(standardFolder) {
            return standardFolder === standard_folder_type_1.StandardFolder.SENT;
        }
        // Standard folders point at a root parentFolderId that the API response never
        // includes, so it is detected here and stripped to flatten the hierarchy.
        getRootFolderId(folders) {
            for (const folder of folders) {
                if ((0, utils_1.isDefined)(folder.wellKnownName) && (0, utils_1.isDefined)(folder.parentFolderId)) {
                    return folder.parentFolderId;
                }
            }
            return null;
        }
        getParentFolderId(parentFolderId, rootFolderId) {
            if (!(0, utils_1.isDefined)(parentFolderId)) {
                return null;
            }
            if (parentFolderId === rootFolderId) {
                return null;
            }
            return parentFolderId;
        }
    };
    return MicrosoftGetAllFoldersService = _classThis;
})();
exports.MicrosoftGetAllFoldersService = MicrosoftGetAllFoldersService;
