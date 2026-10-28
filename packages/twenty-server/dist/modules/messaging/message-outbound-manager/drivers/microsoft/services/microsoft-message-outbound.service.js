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
exports.MicrosoftMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const to_microsoft_recipients_util_1 = require("src/modules/messaging/message-import-manager/utils/to-microsoft-recipients.util");
const get_connected_account_sendable_handle_or_throw_util_1 = require("src/modules/messaging/message-outbound-manager/utils/get-connected-account-sendable-handle-or-throw.util");
const guards_1 = require("@sniptt/guards");
const utils_1 = require("kovaa-lab-shared/utils");
let MicrosoftMessageOutboundService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var MicrosoftMessageOutboundService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            MicrosoftMessageOutboundService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        microsoftOAuth2ClientProvider;
        logger = new common_1.Logger(MicrosoftMessageOutboundService.name);
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
    return MicrosoftMessageOutboundService = _classThis;
})();
exports.MicrosoftMessageOutboundService = MicrosoftMessageOutboundService;
