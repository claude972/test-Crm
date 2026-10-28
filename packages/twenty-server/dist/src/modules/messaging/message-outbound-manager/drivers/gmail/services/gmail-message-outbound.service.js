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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var GmailMessageOutboundService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GmailMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const guards_1 = require("@sniptt/guards");
const googleapis_1 = require("googleapis");
const mail_composer_1 = __importDefault(require("nodemailer/lib/mail-composer"));
const utils_1 = require("kovaa-lab-shared/utils");
const google_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider");
const get_property_from_headers_util_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/utils/get-property-from-headers.util");
const extract_message_id_from_buffer_util_1 = require("src/modules/messaging/message-outbound-manager/utils/extract-message-id-from-buffer.util");
const format_message_from_header_util_1 = require("src/modules/messaging/message-outbound-manager/utils/format-message-from-header.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const to_mail_composer_options_util_1 = require("src/modules/messaging/message-outbound-manager/utils/to-mail-composer-options.util");
let GmailMessageOutboundService = GmailMessageOutboundService_1 = class GmailMessageOutboundService {
    googleOAuth2ClientProvider;
    logger = new common_1.Logger(GmailMessageOutboundService_1.name);
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
exports.GmailMessageOutboundService = GmailMessageOutboundService;
exports.GmailMessageOutboundService = GmailMessageOutboundService = GmailMessageOutboundService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof google_oauth2_client_provider_1.GoogleOAuth2ClientProvider !== "undefined" && google_oauth2_client_provider_1.GoogleOAuth2ClientProvider) === "function" ? _a : Object])
], GmailMessageOutboundService);
