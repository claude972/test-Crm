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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailGetMessagesService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_batcher_1 = require("@jrmdayn/googleapis-batcher");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const google_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider");
const messaging_gmail_excluded_system_labels_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-excluded-system-labels.constant");
const gmail_messages_import_error_handler_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-messages-import-error-handler.service");
const filter_gmail_messages_by_folder_policy_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/filter-gmail-messages-by-folder-policy.util");
const parse_and_format_gmail_message_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/parse-and-format-gmail-message.util");
const GMAIL_BATCH_REQUEST_MAX_SIZE = 50;
let GmailGetMessagesService = class GmailGetMessagesService {
    googleOAuth2ClientProvider;
    gmailMessagesImportErrorHandler;
    constructor(googleOAuth2ClientProvider, gmailMessagesImportErrorHandler) {
        this.googleOAuth2ClientProvider = googleOAuth2ClientProvider;
        this.gmailMessagesImportErrorHandler = gmailMessagesImportErrorHandler;
    }
    async getMessages(messageIds, connectedAccount, messageChannel) {
        const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
        const batchedFetchImplementation = (0, googleapis_batcher_1.batchFetchImplementation)({
            maxBatchSize: GMAIL_BATCH_REQUEST_MAX_SIZE,
        });
        const batchedGmailClient = googleapis_1.google.gmail({
            version: 'v1',
            auth: oAuth2Client,
            fetchImplementation: batchedFetchImplementation,
        });
        const fetchedMessages = await this.fetchMessages(batchedGmailClient, messageIds, connectedAccount);
        const filteredMessages = (0, filter_gmail_messages_by_folder_policy_util_1.filterGmailMessagesByFolderPolicy)(fetchedMessages, messageChannel);
        if (messageChannel.messageFolderImportPolicy !==
            types_1.MessageFolderImportPolicy.SELECTED_FOLDERS) {
            return filteredMessages;
        }
        const syncedLabelIds = (messageChannel.messageFolders ?? [])
            .filter((folder) => folder.isSynced && (0, guards_1.isNonEmptyString)(folder.externalId))
            .map((folder) => folder.externalId);
        if (syncedLabelIds.length === 0) {
            return filteredMessages;
        }
        const fetchedMessageIds = new Set(fetchedMessages.map((message) => message.externalId));
        const filteredMessageIds = new Set(filteredMessages.map((message) => message.externalId));
        const excludedMessageIds = new Set(fetchedMessages
            .filter((message) => !filteredMessageIds.has(message.externalId))
            .map((message) => message.externalId));
        const threadIds = [
            ...new Set(fetchedMessages
                .map((message) => message.messageThreadExternalId)
                .filter(guards_1.isNonEmptyString)),
        ];
        const matchingThreadIds = new Set();
        const missingMessageIds = [];
        await Promise.all(threadIds.map((threadId) => batchedGmailClient.users.threads
            .get({
            userId: 'me',
            id: threadId,
            format: 'metadata',
            metadataHeaders: [],
        })
            .then((response) => {
            const threadMessages = response.data.messages ?? [];
            const threadHasSyncedLabel = threadMessages.some((threadMessage) => !excludedMessageIds.has(threadMessage.id ?? '') &&
                (threadMessage.labelIds ?? []).some((labelId) => syncedLabelIds.includes(labelId)));
            if (!threadHasSyncedLabel) {
                return;
            }
            matchingThreadIds.add(threadId);
            for (const threadMessage of threadMessages) {
                if ((0, guards_1.isNonEmptyString)(threadMessage.id) &&
                    !fetchedMessageIds.has(threadMessage.id)) {
                    missingMessageIds.push(threadMessage.id);
                }
            }
        })
            .catch((error) => {
            this.gmailMessagesImportErrorHandler.handleError(error, threadId);
        })));
        const threadSiblings = missingMessageIds.length > 0
            ? await this.fetchMessages(batchedGmailClient, missingMessageIds, connectedAccount)
            : [];
        const includedMessages = fetchedMessages.filter((message) => filteredMessageIds.has(message.externalId) ||
            matchingThreadIds.has(message.messageThreadExternalId));
        return [...includedMessages, ...threadSiblings];
    }
    async fetchMessages(gmailClient, messageIds, connectedAccount) {
        const results = await Promise.all(messageIds.map((messageId) => gmailClient.users.messages
            .get({ userId: 'me', id: messageId })
            .then((response) => ({ messageId, data: response.data, error: null }))
            .catch((error) => ({ messageId, data: null, error }))));
        return results
            .map(({ messageId, data, error }) => {
            if (error) {
                this.gmailMessagesImportErrorHandler.handleError(error, messageId);
                return undefined;
            }
            return (0, parse_and_format_gmail_message_util_1.parseAndFormatGmailMessage)(data, connectedAccount);
        })
            .filter(utils_1.isDefined)
            .filter((message) => !(message.labelIds ?? []).some((labelId) => messaging_gmail_excluded_system_labels_constant_1.MESSAGING_GMAIL_EXCLUDED_SYSTEM_LABELS.includes(labelId)));
    }
};
exports.GmailGetMessagesService = GmailGetMessagesService;
exports.GmailGetMessagesService = GmailGetMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof google_oauth2_client_provider_1.GoogleOAuth2ClientProvider !== "undefined" && google_oauth2_client_provider_1.GoogleOAuth2ClientProvider) === "function" ? _a : Object, typeof (_b = typeof gmail_messages_import_error_handler_service_1.GmailMessagesImportErrorHandler !== "undefined" && gmail_messages_import_error_handler_service_1.GmailMessagesImportErrorHandler) === "function" ? _b : Object])
], GmailGetMessagesService);
