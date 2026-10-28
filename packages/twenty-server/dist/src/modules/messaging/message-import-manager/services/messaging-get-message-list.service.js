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
exports.MessagingGetMessageListService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const message_import_driver_exception_1 = require("src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception");
const gmail_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-message-list.service");
const imap_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/drivers/imap/services/imap-get-message-list.service");
const microsoft_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-message-list.service");
let MessagingGetMessageListService = class MessagingGetMessageListService {
    gmailGetMessageListService;
    microsoftGetMessageListService;
    imapGetMessageListService;
    constructor(gmailGetMessageListService, microsoftGetMessageListService, imapGetMessageListService) {
        this.gmailGetMessageListService = gmailGetMessageListService;
        this.microsoftGetMessageListService = microsoftGetMessageListService;
        this.imapGetMessageListService = imapGetMessageListService;
    }
    async getMessageLists(messageChannel, messageFolders) {
        switch (messageChannel.connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE:
                return await this.gmailGetMessageListService.getMessageLists({
                    messageChannel,
                    connectedAccount: messageChannel.connectedAccount,
                    messageFolders,
                });
            case types_1.ConnectedAccountProvider.MICROSOFT:
                return this.microsoftGetMessageListService.getMessageLists({
                    messageChannel,
                    connectedAccount: messageChannel.connectedAccount,
                    messageFolders,
                });
            case types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV: {
                return await this.imapGetMessageListService.getMessageLists({
                    messageChannel,
                    connectedAccount: messageChannel.connectedAccount,
                    messageFolders,
                });
            }
            default:
                throw new message_import_driver_exception_1.MessageImportDriverException(`Provider ${messageChannel.connectedAccount.provider} is not supported`, message_import_driver_exception_1.MessageImportDriverExceptionCode.PROVIDER_NOT_SUPPORTED);
        }
    }
};
exports.MessagingGetMessageListService = MessagingGetMessageListService;
exports.MessagingGetMessageListService = MessagingGetMessageListService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gmail_get_message_list_service_1.GmailGetMessageListService,
        microsoft_get_message_list_service_1.MicrosoftGetMessageListService,
        imap_get_message_list_service_1.ImapGetMessageListService])
], MessagingGetMessageListService);
