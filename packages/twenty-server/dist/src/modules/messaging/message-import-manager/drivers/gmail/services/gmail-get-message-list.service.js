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
var GmailGetMessageListService_1;
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const types_1 = require("kovaa-lab-shared/types");
const google_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const messaging_gmail_users_messages_list_max_result_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-users-messages-list-max-result.constant");
const gmail_get_history_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-history.service");
const gmail_message_list_fetch_error_handler_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-message-list-fetch-error-handler.service");
const compute_gmail_exclude_search_filter_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/compute-gmail-exclude-search-filter.util");
let GmailGetMessageListService = GmailGetMessageListService_1 = class GmailGetMessageListService {
    gmailGetHistoryService;
    googleOAuth2ClientProvider;
    gmailMessageListFetchErrorHandler;
    logger = new common_1.Logger(GmailGetMessageListService_1.name);
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
exports.GmailGetMessageListService = GmailGetMessageListService;
exports.GmailGetMessageListService = GmailGetMessageListService = GmailGetMessageListService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof gmail_get_history_service_1.GmailGetHistoryService !== "undefined" && gmail_get_history_service_1.GmailGetHistoryService) === "function" ? _a : Object, typeof (_b = typeof google_oauth2_client_provider_1.GoogleOAuth2ClientProvider !== "undefined" && google_oauth2_client_provider_1.GoogleOAuth2ClientProvider) === "function" ? _b : Object, typeof (_c = typeof gmail_message_list_fetch_error_handler_service_1.GmailMessageListFetchErrorHandler !== "undefined" && gmail_message_list_fetch_error_handler_service_1.GmailMessageListFetchErrorHandler) === "function" ? _c : Object])
], GmailGetMessageListService);
