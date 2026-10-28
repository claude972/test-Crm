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
var MicrosoftGetMessageListService_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const guards_1 = require("@sniptt/guards");
const types_1 = require("kovaa-lab-shared/types");
const microsoft_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider");
const microsoft_message_list_fetch_error_handler_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-message-list-fetch-error-handler.service");
const to_relative_graph_url_util_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/utils/to-relative-graph-url.util");
const utils_1 = require("kovaa-lab-shared/utils");
// Microsoft API limit is 999 messages per request on this endpoint
const MESSAGING_MICROSOFT_USERS_MESSAGES_LIST_MAX_RESULT = 999;
const MESSAGE_LIST_PREFER_HEADER = `odata.maxpagesize=${MESSAGING_MICROSOFT_USERS_MESSAGES_LIST_MAX_RESULT}, IdType="ImmutableId"`;
const MICROSOFT_GRAPH_BATCH_LIMIT = 20;
let MicrosoftGetMessageListService = MicrosoftGetMessageListService_1 = class MicrosoftGetMessageListService {
    microsoftOAuth2ClientProvider;
    microsoftMessageListFetchErrorHandler;
    logger = new common_1.Logger(MicrosoftGetMessageListService_1.name);
    constructor(microsoftOAuth2ClientProvider, microsoftMessageListFetchErrorHandler) {
        this.microsoftOAuth2ClientProvider = microsoftOAuth2ClientProvider;
        this.microsoftMessageListFetchErrorHandler = microsoftMessageListFetchErrorHandler;
    }
    async getMessageLists({ messageChannel, connectedAccount, messageFolders, }) {
        const foldersToProcess = messageChannel.messageFolderImportPolicy ===
            types_1.MessageFolderImportPolicy.SELECTED_FOLDERS
            ? messageFolders.filter((folder) => folder.isSynced)
            : messageFolders;
        if (foldersToProcess.length === 0) {
            this.logger.warn(`Connected account ${connectedAccount.id}: Message Channel: ${messageChannel.id}: No folders to process`);
            return [];
        }
        const microsoftClient = await this.microsoftOAuth2ClientProvider.getClient(connectedAccount.id);
        const results = [];
        for (let batchStart = 0; batchStart < foldersToProcess.length; batchStart += MICROSOFT_GRAPH_BATCH_LIMIT) {
            const foldersBatch = foldersToProcess.slice(batchStart, batchStart + MICROSOFT_GRAPH_BATCH_LIMIT);
            const batchResults = await this.getMessageListBatch(microsoftClient, foldersBatch);
            results.push(...batchResults);
        }
        return results;
    }
    async getMessageListBatch(microsoftClient, foldersBatch) {
        const folderByRequestId = new Map();
        const requests = foldersBatch.map((folder, index) => {
            const requestId = (index + 1).toString();
            folderByRequestId.set(requestId, folder);
            return {
                id: requestId,
                method: 'GET',
                url: this.buildInitialDeltaUrl(folder),
                headers: { Prefer: MESSAGE_LIST_PREFER_HEADER },
            };
        });
        const batchResponse = await microsoftClient
            .api('/$batch')
            .version('beta')
            .post({ requests })
            .catch((error) => this.microsoftMessageListFetchErrorHandler.handleError(error));
        const results = [];
        for (const response of batchResponse.responses) {
            const folder = folderByRequestId.get(response.id);
            if (!(0, utils_1.isDefined)(folder)) {
                throw new Error(`Microsoft batch response references unknown request id ${response.id}`);
            }
            if (response.status !== 200) {
                this.microsoftMessageListFetchErrorHandler.handleError({
                    statusCode: response.status,
                    message: response.body?.error?.message,
                    code: response.body?.error?.code,
                });
            }
            results.push(await this.iterateFolderPages(microsoftClient, folder, response.body));
        }
        return results;
    }
    buildInitialDeltaUrl(folder) {
        if ((0, guards_1.isNonEmptyString)(folder.syncCursor)) {
            return (0, to_relative_graph_url_util_1.toRelativeGraphUrl)(folder.syncCursor);
        }
        const folderId = folder.externalId || folder.name;
        return `/me/mailfolders/${folderId}/messages/delta?$select=id`;
    }
    async iterateFolderPages(microsoftClient, folder, firstPage) {
        const messageExternalIds = [];
        const messageExternalIdsToDelete = [];
        const callback = (data) => {
            if ('@removed' in data) {
                messageExternalIdsToDelete.push(data.id);
            }
            else {
                messageExternalIds.push(data.id);
            }
            return true;
        };
        const pageCollection = {
            value: firstPage?.value ?? [],
            '@odata.nextLink': firstPage?.['@odata.nextLink'],
            '@odata.deltaLink': firstPage?.['@odata.deltaLink'],
        };
        const pageIterator = new microsoft_graph_client_1.PageIterator(microsoftClient, pageCollection, callback, { headers: { Prefer: MESSAGE_LIST_PREFER_HEADER } });
        await pageIterator.iterate().catch((error) => {
            this.microsoftMessageListFetchErrorHandler.handleError(error);
        });
        return {
            messageExternalIds,
            messageExternalIdsToDelete,
            previousSyncCursor: folder.syncCursor,
            nextSyncCursor: pageIterator.getDeltaLink() || '',
            folderId: folder.id,
        };
    }
};
exports.MicrosoftGetMessageListService = MicrosoftGetMessageListService;
exports.MicrosoftGetMessageListService = MicrosoftGetMessageListService = MicrosoftGetMessageListService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider !== "undefined" && microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider) === "function" ? _a : Object, typeof (_b = typeof microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler !== "undefined" && microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler) === "function" ? _b : Object])
], MicrosoftGetMessageListService);
