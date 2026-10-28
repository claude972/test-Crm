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
exports.GmailGetMessagesService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_batcher_1 = require("@jrmdayn/googleapis-batcher");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const utils_1 = require("kovaa-lab-shared/utils");
const types_1 = require("kovaa-lab-shared/types");
const messaging_gmail_excluded_system_labels_constant_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/constants/messaging-gmail-excluded-system-labels.constant");
const filter_gmail_messages_by_folder_policy_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/filter-gmail-messages-by-folder-policy.util");
const parse_and_format_gmail_message_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/parse-and-format-gmail-message.util");
const GMAIL_BATCH_REQUEST_MAX_SIZE = 50;
let GmailGetMessagesService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GmailGetMessagesService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GmailGetMessagesService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
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
    return GmailGetMessagesService = _classThis;
})();
exports.GmailGetMessagesService = GmailGetMessagesService;
