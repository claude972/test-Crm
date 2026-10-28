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
var MicrosoftGetAllFoldersService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftGetAllFoldersService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const utils_1 = require("kovaa-lab-shared/utils");
const microsoft_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider");
const should_create_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-create-folder-by-default.util");
const should_sync_folder_by_default_util_1 = require("src/modules/messaging/message-folder-manager/utils/should-sync-folder-by-default.util");
const microsoft_message_list_fetch_error_handler_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-message-list-fetch-error-handler.service");
const standard_folder_type_1 = require("src/modules/messaging/message-import-manager/drivers/types/standard-folder.type");
const get_standard_folder_by_regex_1 = require("src/modules/messaging/message-import-manager/drivers/utils/get-standard-folder-by-regex");
const MESSAGING_MICROSOFT_MAIL_FOLDERS_LIST_MAX_RESULT = 999;
let MicrosoftGetAllFoldersService = MicrosoftGetAllFoldersService_1 = class MicrosoftGetAllFoldersService {
    microsoftOAuth2ClientProvider;
    microsoftMessageListFetchErrorHandler;
    logger = new common_1.Logger(MicrosoftGetAllFoldersService_1.name);
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
exports.MicrosoftGetAllFoldersService = MicrosoftGetAllFoldersService;
exports.MicrosoftGetAllFoldersService = MicrosoftGetAllFoldersService = MicrosoftGetAllFoldersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider !== "undefined" && microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider) === "function" ? _a : Object, typeof (_b = typeof microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler !== "undefined" && microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler) === "function" ? _b : Object])
], MicrosoftGetAllFoldersService);
