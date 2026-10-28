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
exports.MicrosoftGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const guards_1 = require("@sniptt/guards");
const types_1 = require("kovaa-lab-shared/types");
const to_relative_graph_url_util_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/utils/to-relative-graph-url.util");
const utils_1 = require("kovaa-lab-shared/utils");
// Microsoft API limit is 999 messages per request on this endpoint
const MESSAGING_MICROSOFT_USERS_MESSAGES_LIST_MAX_RESULT = 999;
const MESSAGE_LIST_PREFER_HEADER = `odata.maxpagesize=${MESSAGING_MICROSOFT_USERS_MESSAGES_LIST_MAX_RESULT}, IdType="ImmutableId"`;
const MICROSOFT_GRAPH_BATCH_LIMIT = 20;
let MicrosoftGetMessageListService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MicrosoftGetMessageListService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MicrosoftGetMessageListService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        microsoftOAuth2ClientProvider;
        microsoftMessageListFetchErrorHandler;
        logger = new common_1.Logger(MicrosoftGetMessageListService.name);
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
    return MicrosoftGetMessageListService = _classThis;
})();
exports.MicrosoftGetMessageListService = MicrosoftGetMessageListService;
