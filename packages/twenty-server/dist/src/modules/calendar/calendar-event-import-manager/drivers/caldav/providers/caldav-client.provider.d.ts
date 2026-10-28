import { DAVClient } from 'tsdav';
import { Repository } from 'typeorm';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { CalDavClientService } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-client.service';
export declare class CalDavClientProvider {
    private readonly calDavClientService;
    private readonly connectedAccountTokenEncryptionService;
    private readonly connectedAccountRepository;
    constructor(calDavClientService: CalDavClientService, connectedAccountTokenEncryptionService: ConnectedAccountTokenEncryptionService, connectedAccountRepository: Repository<ConnectedAccountEntity>);
    getClient(connectedAccountId: string): Promise<DAVClient>;
}
