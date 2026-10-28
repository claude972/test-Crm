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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const mail_composer_1 = __importDefault(require("nodemailer/lib/mail-composer"));
const utils_1 = require("kovaa-lab-shared/utils");
const get_property_from_headers_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/get-property-from-headers.util");
const extract_message_id_from_buffer_util_1 = require("src/modules/messaging/message-outbound-manager/utils/extract-message-id-from-buffer.util");
const format_message_from_header_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-message-from-header.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const to_mail_composer_options_util_1 = require("src/modules/messaging/message-outbound-manager/utils/to-mail-composer-options.util");
let GmailMessageOutboundService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var GmailMessageOutboundService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            GmailMessageOutboundService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        googleOAuth2ClientProvider;
        logger = new common_1.Logger(GmailMessageOutboundService.name);
        constructor(googleOAuth2ClientProvider) {
            this.googleOAuth2ClientProvider = googleOAuth2ClientProvider;
        }
        async sendMessage(sendMessageInput, connectedAccount) {
            const { gmailClient, encodedMessage, messageBuffer } = await this.composeGmailMessage(connectedAccount, sendMessageInput);
            const { data } = await gmailClient.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                    ...((0, guards_1.isNonEmptyString)(sendMessageInput.threadExternalId)
                        ? { threadId: sendMessageInput.threadExternalId }
                        : {}),
                },
            });
            const gmailAssignedHeaderMessageId = await this.getGmailAssignedHeaderMessageId(gmailClient, data.id);
            return {
                headerMessageId: gmailAssignedHeaderMessageId ??
                    (0, extract_message_id_from_buffer_util_1.extractMessageIdFromBuffer)(messageBuffer),
                messageExternalId: data.id ?? undefined,
                threadExternalId: data.threadId ?? undefined,
            };
        }
        async getGmailAssignedHeaderMessageId(gmailClient, messageExternalId) {
            if (!(0, guards_1.isNonEmptyString)(messageExternalId)) {
                return;
            }
            return gmailClient.users.messages
                .get({
                userId: 'me',
                id: messageExternalId,
                format: 'metadata',
                metadataHeaders: ['Message-ID'],
            })
                .then(({ data }) => (0, get_property_from_headers_util_1.getPropertyFromHeaders)(data, 'Message-ID'))
                .catch((error) => this.logger.warn(`Failed to read Gmail Message-ID for sent message ${messageExternalId}: ${error}`));
        }
        async createDraft(sendMessageInput, connectedAccount) {
            const { gmailClient, encodedMessage } = await this.composeGmailMessage(connectedAccount, sendMessageInput);
            await gmailClient.users.drafts.create({
                userId: 'me',
                requestBody: {
                    message: {
                        raw: encodedMessage,
                        ...((0, guards_1.isNonEmptyString)(sendMessageInput.threadExternalId)
                            ? { threadId: sendMessageInput.threadExternalId }
                            : {}),
                    },
                },
            });
        }
        async sendDraft(draftExternalId, sendMessageInput, connectedAccount) {
            const sendResult = await this.sendMessage(sendMessageInput, connectedAccount);
            try {
                await this.deleteDraftByMessageId(connectedAccount, draftExternalId);
            }
            catch (error) {
                this.logger.warn(`Failed to delete Gmail draft for message ${draftExternalId} after send: ${error}`);
            }
            return sendResult;
        }
        async deleteDraftByMessageId(connectedAccount, messageId) {
            const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
            const gmailClient = googleapis_1.google.gmail({ version: 'v1', auth: oAuth2Client });
            const draftId = await this.findDraftIdByMessageId(gmailClient, messageId);
            if ((0, utils_1.isDefined)(draftId)) {
                await gmailClient.users.drafts.delete({ userId: 'me', id: draftId });
                return;
            }
            this.logger.warn(`No Gmail draft found for message ${messageId}; skipping delete`);
        }
        async findDraftIdByMessageId(gmailClient, messageId) {
            let pageToken = undefined;
            do {
                const { data } = await gmailClient.users.drafts.list({
                    userId: 'me',
                    maxResults: 500,
                    pageToken,
                });
                const draft = (data.drafts ?? []).find((currentDraft) => currentDraft.message?.id === messageId);
                if ((0, utils_1.isDefined)(draft?.id)) {
                    return draft.id;
                }
                pageToken = data.nextPageToken ?? undefined;
            } while ((0, utils_1.isDefined)(pageToken));
            return undefined;
        }
        async composeGmailMessage(connectedAccount, sendMessageInput) {
            const oAuth2Client = await this.googleOAuth2ClientProvider.getClient(connectedAccount.id);
            const gmailClient = googleapis_1.google.gmail({
                version: 'v1',
                auth: oAuth2Client,
            });
            const peopleClient = googleapis_1.google.people({
                version: 'v1',
                auth: oAuth2Client,
            });
            const fromEmail = (0, guards_1.isNonEmptyString)(sendMessageInput.fromHandle)
                ? (0, get_connected_account_sendable_handle_or_throw_util_1.getConnectedAccountSendableHandleOrThrow)({
                    connectedAccount,
                    requestedFromHandle: sendMessageInput.fromHandle,
                })
                : connectedAccount.handle;
            const fromName = await this.getFromName({
                gmailClient,
                peopleClient,
                fromEmail,
            });
            const from = (0, format_message_from_header_util_1.formatMessageFromHeader)({
                fromEmail,
                fromName,
            });
            const mail = new mail_composer_1.default((0, to_mail_composer_options_util_1.toMailComposerOptions)(from, sendMessageInput));
            const compiledMessage = mail.compile();
            compiledMessage.keepBcc = true;
            const messageBuffer = await compiledMessage.build();
            const encodedMessage = Buffer.from(messageBuffer).toString('base64url');
            return { gmailClient, encodedMessage, messageBuffer };
        }
        async getFromName({ gmailClient, peopleClient, fromEmail, }) {
            const { data: sendAsData } = await gmailClient.users.settings.sendAs.list({
                userId: 'me',
            });
            const sendAsDisplayName = sendAsData.sendAs?.find((sendAs) => sendAs.sendAsEmail?.toLowerCase() === fromEmail.toLowerCase())?.displayName;
            if ((0, guards_1.isNonEmptyString)(sendAsDisplayName)) {
                return sendAsDisplayName;
            }
            const { data: peopleData } = await peopleClient.people.get({
                resourceName: 'people/me',
                personFields: 'names',
            });
            return peopleData?.names?.[0]?.displayName ?? undefined;
        }
    };
    return GmailMessageOutboundService = _classThis;
})();
exports.GmailMessageOutboundService = GmailMessageOutboundService;
