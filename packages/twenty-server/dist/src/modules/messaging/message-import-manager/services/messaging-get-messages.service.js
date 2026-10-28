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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingGetMessagesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const gmail_get_messages_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-messages.service");
const imap_get_messages_service_1 = require("src/modules/messaging/message-import-manager/drivers/imap/services/imap-get-messages.service");
const microsoft_get_messages_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-messages.service");
let MessagingGetMessagesService = class MessagingGetMessagesService {
    gmailGetMessagesService;
    microsoftGetMessagesService;
    imapGetMessagesService;
    constructor(gmailGetMessagesService, microsoftGetMessagesService, imapGetMessagesService) {
        this.gmailGetMessagesService = gmailGetMessagesService;
        this.microsoftGetMessagesService = microsoftGetMessagesService;
        this.imapGetMessagesService = imapGetMessagesService;
    }
    async getMessages(messageIds, connectedAccount, messageChannel) {
        switch (connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return this.gmailGetMessagesService.getMessages(messageIds, connectedAccount, messageChannel);
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftGetMessagesService.getMessages(messageIds, connectedAccount);
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV:
                return this.imapGetMessagesService.getMessages(messageIds, connectedAccount);
            default:
                throw new message_import_driver_exception_1.MessageImportDriverException(`Provider ${connectedAccount.provider} is not supported`, message_import_driver_exception_1.MessageImportDriverExceptionCode.PROVIDER_NOT_SUPPORTED);
        }
    }
};
exports.MessagingGetMessagesService = MessagingGetMessagesService;
exports.MessagingGetMessagesService = MessagingGetMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gmail_get_messages_service_1.GmailGetMessagesService,
        microsoft_get_messages_service_1.MicrosoftGetMessagesService, typeof (_a = typeof imap_get_messages_service_1.ImapGetMessagesService !== "undefined" && imap_get_messages_service_1.ImapGetMessagesService) === "function" ? _a : Object])
], MessagingGetMessagesService);
