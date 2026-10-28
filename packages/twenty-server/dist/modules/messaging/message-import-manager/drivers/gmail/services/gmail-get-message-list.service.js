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
exports.GmailGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const types_1 = require("kovaa-lab-shared/types");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const messaging_gmail_users_messages_list_max_result_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-users-messages-list-max-result.constant");
const compute_gmail_exclude_search_filter_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-gmail-exclude-search-filter.util");
let GmailGetMessageListService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GmailGetMessageListService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GmailGetMessageListService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        gmailGetHistoryService;
        googleOAuth2ClientProvider;
        gmailMessageListFetchErrorHandler;
        logger = new common_1.Logger(GmailGetMessageListService.name);
        constructor(gmailGetHistoryService, googleOAuth2ClientProvider, gmailMessageListFetchErrorHandler) {
            this.gmailGetHistoryService = gmailGetHistoryService;
            this.googleOAuth2ClientProvider = googleOAuth2ClientProvider;
            this.gmailMessageListFetchErrorHandler = gmailMessageListFetchErrorHandler;
        }
        async getMessageListWithoutCursor(connectedAccount, messageFolders, messageChannel) {
            const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
            const gmailClient = googleapis_1.google.gmail({
                version: 'v1',
                auth: oAuth2Client,
            });
            let pageToken;
            let hasMoreMessages = true;
            const messageExternalIds = [];
            const excludedSearchFilter = (0, compute_gmail_exclude_search_filter_util_1.computeGmailExcludeSearchFilter)(messageFolders, messageChannel.messageFolderImportPolicy);
            while (hasMoreMessages) {
                const messageList = await gmailClient.users.messages
                    .list({
                    userId: 'me',
                    maxResults: messaging_gmail_users_messages_list_max_result_constant_1.MESSAGING_GMAIL_USERS_MESSAGES_LIST_MAX_RESULT,
                    pageToken,
                    q: excludedSearchFilter,
                })
                    .catch((error) => {
                    this.logger.error(`Connected account ${connectedAccount.id}: Error fetching message list: ${error.message}`);
                    this.logger.error(`Connected account ${connectedAccount.id}: Error fetching message list: ${JSON.stringify(error)}`);
                    this.gmailMessageListFetchErrorHandler.handleError(error);
                    return {
                        data: {
                            messages: [],
                            nextPageToken: undefined,
                        },
                    };
                });
                const { messages } = messageList.data;
                const hasMessages = messages && messages.length > 0;
                if (!hasMessages) {
                    break;
                }
                pageToken = messageList.data.nextPageToken ?? undefined;
                hasMoreMessages = !!pageToken;
                // @ts-expect-error legacy noImplicitAny
                messageExternalIds.push(...messages.map((message) => message.id));
            }
            if (messageExternalIds.length === 0) {
                return [
                    {
                        messageExternalIds,
                        nextSyncCursor: '',
                        previousSyncCursor: '',
                        messageExternalIdsToDelete: [],
                        folderId: undefined,
                    },
                ];
            }
            const firstMessageExternalId = messageExternalIds[0];
            const firstMessageContent = await gmailClient.users.messages
                .get({
                userId: 'me',
                id: firstMessageExternalId,
            })
                .catch((error) => {
                this.gmailMessageListFetchErrorHandler.handleError(error);
            });
            const nextSyncCursor = firstMessageContent?.data?.historyId;
            if (!nextSyncCursor) {
                throw new message_import_driver_exception_1.MessageImportDriverException(`No historyId found for message ${firstMessageExternalId} for connected account ${connectedAccount.id}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.NO_NEXT_SYNC_CURSOR);
            }
            return [
                {
                    messageExternalIds,
                    nextSyncCursor,
                    previousSyncCursor: '',
                    messageExternalIdsToDelete: [],
                    folderId: undefined,
                },
            ];
        }
        async getMessageLists({ messageChannel, connectedAccount, messageFolders, }) {
            if (messageChannel.messageFolderImportPolicy ===
                types_1.MessageFolderImportPolicy.SELECTED_FOLDERS) {
                const foldersToSync = messageFolders.filter((folder) => folder.isSynced);
                if (foldersToSync.length === 0) {
                    this.logger.warn(`Connected account ${connectedAccount.id} Message Channel: ${messageChannel.id}: No folders to process`);
                    return [];
                }
            }
            const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
            const gmailClient = googleapis_1.google.gmail({
                version: 'v1',
                auth: oAuth2Client,
            });
            if (!(0, guards_1.isNonEmptyString)(messageChannel.syncCursor)) {
                return this.getMessageListWithoutCursor(connectedAccount, messageFolders, messageChannel);
            }
            const { history, historyId: nextSyncCursor } = await this.gmailGetHistoryService.getHistory(gmailClient, messageChannel.syncCursor);
            const { messagesAdded, messagesDeleted } = await this.gmailGetHistoryService.getMessageIdsFromHistory(history);
            if (!nextSyncCursor) {
                throw new message_import_driver_exception_1.MessageImportDriverException(`No nextSyncCursor found for connected account ${connectedAccount.id}`, message_import_driver_exception_1.MessageImportDriverExceptionCode.NO_NEXT_SYNC_CURSOR);
            }
            return [
                {
                    messageExternalIds: messagesAdded,
                    messageExternalIdsToDelete: messagesDeleted,
                    previousSyncCursor: messageChannel.syncCursor,
                    nextSyncCursor,
                    folderId: undefined,
                },
            ];
        }
    };
    return GmailGetMessageListService = _classThis;
})();
exports.GmailGetMessageListService = GmailGetMessageListService;
