"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const testing_1 = require("@nestjs/testing");
const types_1 = require("src/shared/types");
const kovaa_lab_config_module_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.module");
const connected_account_token_encryption_service_1 = require("src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service");
const message_channel_entity_1 = require("src/engine/metadata-modules/message-channel/entities/message-channel.entity");
const message_folder_entity_1 = require("src/engine/metadata-modules/message-folder/entities/message-folder.entity");
const microsoft_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider");
const microsoft_api_examples_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/mocks/microsoft-api-examples");
const folders_type_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/types/folders.type");
const microsoft_get_message_list_service_1 = require("./microsoft-get-message-list.service");
const microsoft_message_list_fetch_error_handler_service_1 = require("./microsoft-message-list-fetch-error-handler.service");
const syncCursor = `replace-with-your-sync-cursor`;
const mockConnectedAccount = {
    id: 'connected-account-id',
    provider: types_1.ConnectedAccountProvider.MICROSOFT,
    handle: 'test@outlook.com',
};
const mockMessageChannel = {
    id: 'message-channel-id',
    syncCursor: '', // Should be empty for Microsoft as cursors are stored at the folder level
    messageFolderImportPolicy: types_1.MessageFolderImportPolicy.SELECTED_FOLDERS,
};
xdescribe('Microsoft dev tests : get message list service', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            imports: [kovaa_lab_config_module_1.KovaaLabCRMConfigModule.forRoot()],
            providers: [
                microsoft_get_message_list_service_1.MicrosoftGetMessageListService,
                {
                    provide: microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider,
                    useValue: { getClient: jest.fn() },
                },
                {
                    provide: microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler,
                    useValue: { handleError: jest.fn() },
                },
                config_1.ConfigService,
                { provide: connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService, useValue: {} },
            ],
        }).compile();
        service = module.get(microsoft_get_message_list_service_1.MicrosoftGetMessageListService);
    });
    it('Should fetch and return message list successfully', async () => {
        const result = await service.getMessageLists({
            connectedAccount: mockConnectedAccount,
            messageChannel: mockMessageChannel,
            messageFolders: [
                {
                    id: 'inbox-folder-id',
                    name: folders_type_1.MessageFolderName.INBOX,
                    syncCursor: 'inbox-sync-cursor',
                    isSynced: false,
                    isSentFolder: false,
                    externalId: null,
                    parentFolderId: null,
                    pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
                },
            ],
        });
        expect(result[0].messageExternalIds.length).toBeGreaterThan(0);
    });
    // if you need to run this test, you need to manually update the syncCursor to a valid one
    xit('Should fetch and return partial message list successfully', async () => {
        const result = await service.getMessageLists({
            connectedAccount: mockConnectedAccount,
            messageChannel: mockMessageChannel,
            messageFolders: [
                {
                    id: 'inbox-folder-id',
                    name: folders_type_1.MessageFolderName.INBOX,
                    syncCursor: syncCursor,
                    isSynced: false,
                    isSentFolder: false,
                    externalId: null,
                    parentFolderId: null,
                    pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
                },
            ],
        });
        expect(result[0].nextSyncCursor).toBeTruthy();
    });
    it('Should fail partial message if syncCursor is invalid', async () => {
        await expect(service.getMessageLists({
            messageChannel: {
                id: 'message-channel-id',
                syncCursor: '',
                messageFolderImportPolicy: types_1.MessageFolderImportPolicy.SELECTED_FOLDERS,
            },
            connectedAccount: mockConnectedAccount,
            messageFolders: [
                {
                    id: 'inbox-folder-id',
                    name: folders_type_1.MessageFolderName.INBOX,
                    syncCursor: 'invalid-syncCursor',
                    isSynced: false,
                    isSentFolder: false,
                    externalId: null,
                    parentFolderId: null,
                    pendingSyncAction: types_1.MessageFolderPendingSyncAction.NONE,
                },
            ],
        })).rejects.toThrowError(/Resource not found for the segment|Badly formed content/g);
    });
});
xdescribe('Microsoft dev tests : get message list service for folders', () => {
    let service;
    const inboxFolder = new message_folder_entity_1.MessageFolderEntity();
    inboxFolder.id = 'inbox-folder-id';
    inboxFolder.name = folders_type_1.MessageFolderName.INBOX;
    inboxFolder.syncCursor = 'inbox-sync-cursor';
    inboxFolder.messageChannelId = 'message-channel-1';
    inboxFolder.parentFolderId = null;
    const sentFolder = new message_folder_entity_1.MessageFolderEntity();
    sentFolder.id = 'sent-folder-id';
    sentFolder.name = folders_type_1.MessageFolderName.SENT_ITEMS;
    sentFolder.syncCursor = 'sent-sync-cursor';
    sentFolder.messageChannelId = 'message-channel-1';
    sentFolder.parentFolderId = null;
    const otherFolder = new message_folder_entity_1.MessageFolderEntity();
    otherFolder.id = 'other-folder-id';
    otherFolder.name = 'other';
    otherFolder.syncCursor = 'other-sync-cursor';
    otherFolder.messageChannelId = 'message-channel-2';
    otherFolder.parentFolderId = null;
    const messageChannelNoFolders = new message_channel_entity_1.MessageChannelEntity();
    messageChannelNoFolders.id = 'message-channel-0';
    messageChannelNoFolders.messageFolders = [];
    messageChannelNoFolders.syncCursor = '';
    messageChannelNoFolders.messageFolderImportPolicy =
        types_1.MessageFolderImportPolicy.SELECTED_FOLDERS;
    const messageChannelMicrosoftOneFolder = new message_channel_entity_1.MessageChannelEntity();
    messageChannelMicrosoftOneFolder.id = 'message-channel-1';
    messageChannelMicrosoftOneFolder.messageFolders = [inboxFolder];
    messageChannelMicrosoftOneFolder.syncCursor = '';
    messageChannelMicrosoftOneFolder.messageFolderImportPolicy =
        types_1.MessageFolderImportPolicy.SELECTED_FOLDERS;
    const messageChannelMicrosoft = new message_channel_entity_1.MessageChannelEntity();
    messageChannelMicrosoft.id = 'message-channel-2';
    messageChannelMicrosoft.messageFolders = [inboxFolder, sentFolder];
    messageChannelMicrosoft.syncCursor = '';
    messageChannelMicrosoft.messageFolderImportPolicy =
        types_1.MessageFolderImportPolicy.SELECTED_FOLDERS;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            imports: [kovaa_lab_config_module_1.KovaaLabCRMConfigModule.forRoot()],
            providers: [
                microsoft_get_message_list_service_1.MicrosoftGetMessageListService,
                {
                    provide: microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider,
                    useValue: { getClient: jest.fn() },
                },
                {
                    provide: microsoft_message_list_fetch_error_handler_service_1.MicrosoftMessageListFetchErrorHandler,
                    useValue: { handleError: jest.fn() },
                },
                config_1.ConfigService,
                { provide: connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService, useValue: {} },
            ],
        }).compile();
        service = module.get(microsoft_get_message_list_service_1.MicrosoftGetMessageListService);
        const mockMicrosoftClient = {
            api: jest.fn().mockReturnThis(),
            version: jest.fn().mockReturnThis(),
            headers: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(microsoft_api_examples_1.microsoftGraphWithMessagesDeltaLink),
        };
        jest
            .spyOn(microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider.prototype, 'getClient')
            .mockResolvedValue(mockMicrosoftClient);
    });
    it('Should return empty array', async () => {
        const result = await service.getMessageLists({
            messageChannel: messageChannelNoFolders,
            connectedAccount: mockConnectedAccount,
            messageFolders: [],
        });
        expect(result.length).toBe(0);
    });
    it('Should return an array of one items', async () => {
        const result = await service.getMessageLists({
            messageChannel: messageChannelMicrosoftOneFolder,
            connectedAccount: mockConnectedAccount,
            messageFolders: [inboxFolder],
        });
        expect(result.length).toBe(1);
        expect(result[0].folderId).toBe(inboxFolder.id);
        expect(result[0].messageExternalIds.length).toBeGreaterThan(0);
    });
    it('Should return an array of two items', async () => {
        const result = await service.getMessageLists({
            messageChannel: messageChannelMicrosoft,
            connectedAccount: mockConnectedAccount,
            messageFolders: [inboxFolder, sentFolder],
        });
        expect(result.length).toBe(2);
    });
});
