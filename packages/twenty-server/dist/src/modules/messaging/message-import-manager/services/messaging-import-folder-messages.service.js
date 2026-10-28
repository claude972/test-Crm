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
exports.MessagingImportFolderMessagesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("kovaa-lab-shared/types");
const gmail_get_message_list_service_1 = require("src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-message-list.service");
let MessagingImportFolderMessagesService = class MessagingImportFolderMessagesService {
    gmailGetMessageListService;
    constructor(gmailGetMessageListService) {
        this.gmailGetMessageListService = gmailGetMessageListService;
    }
    async getFolderMessageIdsToImport(messageChannel, messageFolder) {
        switch (messageChannel.connectedAccount.provider) {
            case types_1.ConnectedAccountProvider.GOOGLE: {
                const foldersScopedToImportedFolder = messageChannel.messageFolders.map((folder) => ({
                    name: folder.name,
                    externalId: folder.externalId,
                    parentFolderId: folder.parentFolderId,
                    isSynced: folder.id === messageFolder.id,
                }));
                const [messageList] = await this.gmailGetMessageListService.getMessageListWithoutCursor(messageChannel.connectedAccount, foldersScopedToImportedFolder, {
                    messageFolderImportPolicy: types_1.MessageFolderImportPolicy.SELECTED_FOLDERS,
                });
                return messageList?.messageExternalIds ?? [];
            }
            default:
                return [];
        }
    }
};
exports.MessagingImportFolderMessagesService = MessagingImportFolderMessagesService;
exports.MessagingImportFolderMessagesService = MessagingImportFolderMessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gmail_get_message_list_service_1.GmailGetMessageListService])
], MessagingImportFolderMessagesService);
