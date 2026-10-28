"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const testing_1 = require("@nestjs/testing");
const types_1 = require("src/shared/types");
const kovaa_lab_config_module_1 = require("src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.module");
const microsoft_oauth2_client_provider_1 = require("src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider");
const microsoft_fetch_by_batch_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-fetch-by-batch.service");
const microsoft_get_messages_service_1 = require("src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-messages.service");
const microsoft_messages_import_error_handler_service_1 = require("./microsoft-messages-import-error-handler.service");
const mockMessageIds = [
    'AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0AGnUPtcQC-Eiwmc39SmMpPgAAA8ZAfgAA',
    'AAkALgAAAAAAHYQDEapmEc2byACqAC-EWg0AGnUPtcQC-Eiwmc39SmMpPgAAAiVYkAAA',
];
const accessToken = 'replace-with-your-access-token';
const refreshToken = 'replace-with-your-refresh-token';
xdescribe('Microsoft dev tests : get messages service', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            imports: [kovaa_lab_config_module_1.KovaaLabCRMConfigModule.forRoot()],
            providers: [
                microsoft_get_messages_service_1.MicrosoftGetMessagesService,
                {
                    provide: microsoft_messages_import_error_handler_service_1.MicrosoftMessagesImportErrorHandler,
                    useValue: { handleError: jest.fn() },
                },
                {
                    provide: microsoft_oauth2_client_provider_1.MicrosoftOAuth2ClientProvider,
                    useValue: { getClient: jest.fn() },
                },
                microsoft_fetch_by_batch_service_1.MicrosoftFetchByBatchService,
                config_1.ConfigService,
            ],
        }).compile();
        service = module.get(microsoft_get_messages_service_1.MicrosoftGetMessagesService);
    });
    const mockConnectedAccount = {
        id: 'connected-account-id',
        provider: types_1.ConnectedAccountProvider.MICROSOFT,
        handle: 'John.Walker@outlook.fr',
        handleAliases: [],
        accessToken: accessToken,
        refreshToken: refreshToken,
        workspaceId: 'workspace-id',
    };
    it('should fetch and format messages successfully', async () => {
        const result = await service.getMessages(mockMessageIds, mockConnectedAccount);
        expect(result).toHaveLength(1);
    });
});
