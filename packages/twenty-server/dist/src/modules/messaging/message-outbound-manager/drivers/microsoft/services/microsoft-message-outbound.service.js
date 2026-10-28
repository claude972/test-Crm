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
var MicrosoftMessageOutboundService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const microsoft_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider");
const to_microsoft_recipients_util_1 = require("src/modules/messaging/message-import-manager/utils/to-microsoft-recipients.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
let MicrosoftMessageOutboundService = MicrosoftMessageOutboundService_1 = class MicrosoftMessageOutboundService {
    microsoftOAuth2ClientProvider;
    logger = new common_1.Logger(MicrosoftMessageOutboundService_1.name);
    constructor(microsoftOAuth2ClientProvider) {
        this.microsoftOAuth2ClientProvider = microsoftOAuth2ClientProvider;
    }
    async sendMessage(sendMessageInput, connectedAccount) {
        const microsoftClient = await this.microsoftOAuth2ClientProvider.getClient(connectedAccount.id);
        const { id: messageId, internetMessageId, conversationId, } = await this.createDraftMessage({
            microsoftClient,
            sendMessageInput,
            connectedAccount,
        });
        await microsoftClient.api(`/me/messages/${messageId}/send`).post({});
        return {
            headerMessageId: internetMessageId ?? '',
            messageExternalId: messageId,
            threadExternalId: conversationId ?? undefined,
        };
    }
    async createDraft(sendMessageInput, connectedAccount) {
        const microsoftClient = await this.microsoftOAuth2ClientProvider.getClient(connectedAccount.id);
        await this.createDraftMessage({
            microsoftClient,
            sendMessageInput,
            connectedAccount,
        });
    }
    async sendDraft(draftExternalId, sendMessageInput, connectedAccount) {
        const sendResult = await this.sendMessage(sendMessageInput, connectedAccount);
        const microsoftClient = await this.microsoftOAuth2ClientProvider.getClient(connectedAccount.id);
        await microsoftClient
            .api(`/me/messages/${draftExternalId}`)
            .delete()
            .catch((error) => this.logger.warn(`Failed to delete Microsoft draft ${draftExternalId} after send: ${error}`));
        return sendResult;
    }
    async createDraftMessage({ microsoftClient, sendMessageInput, connectedAccount, }) {
        const parentMessageGraphId = sendMessageInput.inReplyTo
            ? await this.findMessageByInternetMessageId({
                microsoftClient,
                internetMessageId: sendMessageInput.inReplyTo,
            })
            : undefined;
        const message = this.composeMicrosoftMessage({
            sendMessageInput,
            connectedAccount,
        });
        const draftMessage = (0, utils_1.isDefined)(parentMessageGraphId)
            ? await this.createReplyDraftMessage({
                microsoftClient,
                parentMessageGraphId,
                message,
            })
            : await this.createNewDraftMessage({ microsoftClient, message });
        await this.postAttachmentsToMessageCollection({
            microsoftClient,
            messageId: draftMessage.id,
            attachments: sendMessageInput.attachments,
        }).catch(async (error) => {
            await microsoftClient
                .api(`/me/messages/${draftMessage.id}`)
                .delete()
                .catch((deletionError) => this.logger.warn(`Failed to delete Microsoft draft ${draftMessage.id} after its attachments failed to upload: ${deletionError}`));
            throw error;
        });
        return draftMessage;
    }
    async createNewDraftMessage({ microsoftClient, message, }) {
        const response = await microsoftClient.api('/me/messages').post(message);
        return {
            id: response.id,
            internetMessageId: response.internetMessageId,
            conversationId: response.conversationId,
        };
    }
    async createReplyDraftMessage({ microsoftClient, parentMessageGraphId, message, }) {
        const reply = await microsoftClient
            .api(`/me/messages/${parentMessageGraphId}/createReply`)
            .post({});
        const patched = await microsoftClient
            .api(`/me/messages/${reply.id}`)
            .patch(message);
        return {
            id: reply.id,
            internetMessageId: patched?.internetMessageId ?? reply.internetMessageId,
            conversationId: patched?.conversationId ?? reply.conversationId,
        };
    }
    async postAttachmentsToMessageCollection({ microsoftClient, messageId, attachments, }) {
        if (!(0, utils_1.isDefined)(attachments)) {
            return;
        }
        for (const attachment of attachments) {
            await microsoftClient.api(`/me/messages/${messageId}/attachments`).post({
                '@odata.type': '#microsoft.graph.fileAttachment',
                name: attachment.filename,
                contentType: attachment.contentType,
                contentBytes: attachment.content.toString('base64'),
            });
        }
    }
    async findMessageByInternetMessageId({ microsoftClient, internetMessageId, }) {
        const escapedInternetMessageId = internetMessageId.split("'").join("''");
        const response = await microsoftClient
            .api('/me/messages')
            .filter(`internetMessageId eq '${escapedInternetMessageId}'`)
            .select('id')
            .top(1)
            .get();
        return response?.value?.[0]?.id;
    }
    composeMicrosoftMessage({ sendMessageInput, connectedAccount, }) {
        const from = (0, guards_1.isNonEmptyString)(sendMessageInput.fromHandle)
            ? {
                from: {
                    emailAddress: {
                        address: (0, get_connected_account_sendable_handle_or_throw_util_1.getConnectedAccountSendableHandleOrThrow)({
                            connectedAccount,
                            requestedFromHandle: sendMessageInput.fromHandle,
                        }),
                    },
                },
            }
            : {};
        return {
            subject: sendMessageInput.subject,
            ...from,
            body: {
                contentType: 'HTML',
                content: sendMessageInput.html,
            },
            toRecipients: (0, to_microsoft_recipients_util_1.toMicrosoftRecipients)(sendMessageInput.to),
            ccRecipients: (0, to_microsoft_recipients_util_1.toMicrosoftRecipients)(sendMessageInput.cc),
            bccRecipients: (0, to_microsoft_recipients_util_1.toMicrosoftRecipients)(sendMessageInput.bcc),
        };
    }
};
exports.MicrosoftMessageOutboundService = MicrosoftMessageOutboundService;
exports.MicrosoftMessageOutboundService = MicrosoftMessageOutboundService = MicrosoftMessageOutboundService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider !== "undefined" && microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider) === "function" ? _a : Object])
], MicrosoftMessageOutboundService);
