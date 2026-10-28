"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingFolderSyncManagerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const oauth2_client_manager_module_1 = require("src/modules/connected-account/oauth2-client-manager/oauth2-client-manager.module");
const gmail_folders_error_handler_service_1 = require("src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-folders-error-handler.service");
const gmail_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-get-all-folders.service");
const imap_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/imap/services/imap-get-all-folders.service");
const microsoft_get_all_folders_service_1 = require("src/modules/messaging/message-folder-manager/drivers/microsoft/services/microsoft-get-all-folders.service");
const sync_message_folders_service_1 = require("src/modules/messaging/message-folder-manager/services/sync-message-folders.service");
const messaging_imap_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/imap/messaging-imap-driver.module");
const messaging_microsoft_driver_module_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/messaging-microsoft-driver.module");
const provide_workspace_scoped_repository_1 = require("src/engine/kovaa-lab-orm/workspace-scoped-repository/provide-workspace-scoped-repository");
let MessagingFolderSyncManagerModule = class MessagingFolderSyncManagerModule {
};
exports.MessagingFolderSyncManagerModule = MessagingFolderSyncManagerModule;
exports.MessagingFolderSyncManagerModule = MessagingFolderSyncManagerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([message_folder_entity_1.MessageFolderEntity]),
            oauth2_client_manager_module_1.OAuth2ClientManagerModule,
            messaging_microsoft_driver_module_1.MessagingMicrosoftDriverModule,
            messaging_imap_driver_module_1.MessagingIMAPDriverModule,
        ],
        providers: [
            sync_message_folders_service_1.SyncMessageFoldersService,
            gmail_get_all_folders_service_1.GmailGetAllFoldersService,
            gmail_folders_error_handler_service_1.GmailFoldersErrorHandlerService,
            imap_get_all_folders_service_1.ImapGetAllFoldersService,
            microsoft_get_all_folders_service_1.MicrosoftGetAllFoldersService,
            (0, provide_workspace_scoped_repository_1.provideWorkspaceScopedRepository)(message_folder_entity_1.MessageFolderEntity),
        ],
        exports: [sync_message_folders_service_1.SyncMessageFoldersService],
    })
], MessagingFolderSyncManagerModule);
