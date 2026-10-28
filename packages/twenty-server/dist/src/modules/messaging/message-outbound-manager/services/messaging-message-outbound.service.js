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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingMessageOutboundService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const utils_1 = require("kovaa-lab-shared/utils");
const email_group_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/email-group/services/email-group-message-outbound.service");
const gmail_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/gmail/services/gmail-message-outbound.service");
const imap_smtp_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/imap/services/imap-smtp-message-outbound.service");
const microsoft_message_outbound_service_1 = require("src/modules/messaging/message-outbound-manager/drivers/microsoft/services/microsoft-message-outbound.service");
let MessagingMessageOutboundService = class MessagingMessageOutboundService {
    gmailMessageOutboundService;
    microsoftMessageOutboundService;
    imapSmtpMessageOutboundService;
    emailGroupMessageOutboundService;
    constructor(gmailMessageOutboundService, microsoftMessageOutboundService, imapSmtpMessageOutboundService, emailGroupMessageOutboundService) {
        this.gmailMessageOutboundService = gmailMessageOutboundService;
        this.microsoftMessageOutboundService = microsoftMessageOutboundService;
        this.imapSmtpMessageOutboundService = imapSmtpMessageOutboundService;
        this.emailGroupMessageOutboundService = emailGroupMessageOutboundService;
    }
    async sendMessage(sendMessageInput, connectedAccount) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.gmailMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.imapSmtpMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.EMAIL_GROUP:
                return this.emailGroupMessageOutboundService.sendMessage(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.OIDC:
            case types_1.ConnectedAccountProvider.SAML:
            case types_1.ConnectedAccountProvider.APP:
                throw new Error(`Provider ${connectedAccount.provider} does not support sending messages`);
            default:
                (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for sending messages`);
        }
    }
    async createDraft(sendMessageInput, connectedAccount) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.gmailMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.imapSmtpMessageOutboundService.createDraft(sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.EMAIL_GROUP:
            case types_1.ConnectedAccountProvider.OIDC:
            case types_1.ConnectedAccountProvider.SAML:
            case types_1.ConnectedAccountProvider.APP:
                throw new Error(`Provider ${connectedAccount.provider} does not support creating drafts`);
            default:
                (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for creating drafts`);
        }
    }
    async sendDraft(draftExternalId, sendMessageInput, connectedAccount) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.gmailMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.imapSmtpMessageOutboundService.sendDraft(draftExternalId, sendMessageInput, connectedAccount);
            case types_1.ConnectedAccountProvider.EMAIL_GROUP:
            case types_1.ConnectedAccountProvider.OIDC:
            case types_1.ConnectedAccountProvider.SAML:
            case types_1.ConnectedAccountProvider.APP:
                throw new Error(`Provider ${connectedAccount.provider} does not support sending drafts`);
            default:
                (0, utils_1.assertUnreachable)(connectedAccount.provider, `Provider ${connectedAccount.provider} not supported for sending drafts`);
        }
    }
};
exports.MessagingMessageOutboundService = MessagingMessageOutboundService;
exports.MessagingMessageOutboundService = MessagingMessageOutboundService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gmail_message_outbound_service_1.GmailMessageOutboundService,
        microsoft_message_outbound_service_1.MicrosoftMessageOutboundService,
        imap_smtp_message_outbound_service_1.ImapSmtpMessageOutboundService,
        email_group_message_outbound_service_1.EmailGroupMessageOutboundService])
], MessagingMessageOutboundService);
