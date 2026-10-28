"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const typeorm_1 = require("@nestjs/typeorm");
const types_1 = require("kovaa-lab-shared/types");
const connected_account_entity_1 = require("src/engine/metadata-modules/connected-account/entities/connected-account.entity");
const connected_account_token_encryption_service_1 = require("src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service");
const calendar_event_import_driver_exception_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception");
const caldav_client_service_1 = require("src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-client.service");
const caldav_client_provider_1 = require("./caldav-client.provider");
const mockCalDavParams = {
    host: 'https://caldav.example.com',
    username: 'user@example.com',
    password: 'plaintext-password',
};
const mockConnectionParameters = {
    CALDAV: {
        host: 'https://caldav.example.com',
        username: 'user@example.com',
        password: 'encrypted-password',
    },
};
describe('CalDavClientProvider', () => {
    let provider;
    let connectedAccountRepository;
    let connectedAccountTokenEncryptionService;
    let calDavClientService;
    const mockWorkspaceId = 'workspace-123';
    const mockConnectedAccountId = 'account-456';
    const mockConnectedAccount = {
        id: mockConnectedAccountId,
        workspaceId: mockWorkspaceId,
        provider: types_1.ConnectedAccountProvider.IMAP_SMTP_CALDAV,
        handle: 'user@example.com',
        connectionParameters: mockConnectionParameters,
    };
    beforeEach(async () => {
        connectedAccountTokenEncryptionService = {
            decryptProtocolPassword: jest.fn().mockReturnValue(mockCalDavParams),
        };
        calDavClientService = {
            getClient: jest
                .fn()
                .mockResolvedValue({ options: { serverUrl: mockCalDavParams.host } }),
        };
        connectedAccountRepository = {
            findOne: jest.fn().mockResolvedValue(mockConnectedAccount),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                caldav_client_provider_1.CalDavClientProvider,
                {
                    provide: caldav_client_service_1.CalDavClientService,
                    useValue: calDavClientService,
                },
                {
                    provide: connected_account_token_encryption_service_1.ConnectedAccountTokenEncryptionService,
                    useValue: connectedAccountTokenEncryptionService,
                },
                {
                    provide: (0, typeorm_1.getRepositoryToken)(connected_account_entity_1.ConnectedAccountEntity),
                    useValue: connectedAccountRepository,
                },
            ],
        }).compile();
        provider = module.get(caldav_client_provider_1.CalDavClientProvider);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getClient', () => {
        it('should load the entity, decrypt CalDAV params, and return a DAVClient', async () => {
            const client = await provider.getClient(mockConnectedAccountId);
            expect(connectedAccountRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockConnectedAccountId },
            });
            expect(connectedAccountTokenEncryptionService.decryptProtocolPassword).toHaveBeenCalledWith({
                protocolParams: mockConnectionParameters.CALDAV,
                workspaceId: mockWorkspaceId,
            });
            expect(calDavClientService.getClient).toHaveBeenCalledWith({
                serverUrl: mockCalDavParams.host,
                username: mockCalDavParams.username,
                password: mockCalDavParams.password,
            });
            expect(client).toBeDefined();
        });
        it('should throw INSUFFICIENT_PERMISSIONS when the connected account does not exist', async () => {
            connectedAccountRepository.findOne.mockResolvedValue(null);
            await expect(provider.getClient(mockConnectedAccountId)).rejects.toMatchObject({
                code: calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS,
            });
        });
        it('should throw INSUFFICIENT_PERMISSIONS when CalDAV credentials are missing', async () => {
            connectedAccountRepository.findOne.mockResolvedValue({
                ...mockConnectedAccount,
                provider: types_1.ConnectedAccountProvider.GOOGLE,
                connectionParameters: {},
            });
            await expect(provider.getClient(mockConnectedAccountId)).rejects.toMatchObject({
                code: calendar_event_import_driver_exception_1.CalendarEventImportDriverExceptionCode.INSUFFICIENT_PERMISSIONS,
            });
        });
    });
});
