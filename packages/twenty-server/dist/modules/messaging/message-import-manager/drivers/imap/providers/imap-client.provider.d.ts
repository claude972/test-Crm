import { ImapFlow } from 'imapflow';
import { Repository } from 'typeorm';
import { SecureHttpClientService } from 'src/engine/core-modules/secure-http-client/secure-http-client.service';
import { KovaaLabCRMConfigService } from 'src/engine/core-modules/kovaa-lab-config/kovaa-lab-config.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
export declare class ImapClientProvider {
    private readonly secureHttpClientService;
    private readonly kovaaLabConfigService;
    private readonly connectedAccountTokenEncryptionService;
    private readonly connectedAccountRepository;
    private readonly logger;
    private static readonly CONNECTION_TIMEOUT_MS;
    private static readonly GREETING_TIMEOUT_MS;
    constructor(secureHttpClientService: SecureHttpClientService, kovaaLabConfigService: KovaaLabCRMConfigService, connectedAccountTokenEncryptionService: ConnectedAccountTokenEncryptionService, connectedAccountRepository: Repository<ConnectedAccountEntity>);
    getClient(connectedAccountId: string): Promise<ImapFlow>;
    closeClient(client: ImapFlow): Promise<void>;
    private loadConnectedAccount;
    private createConnection;
}
