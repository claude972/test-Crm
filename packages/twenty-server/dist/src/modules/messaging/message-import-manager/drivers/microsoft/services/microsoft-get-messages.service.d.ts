import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type MicrosoftGraphBatchResponse } from 'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-get-messages.interface';
import { type MessageWithParticipants } from 'src/modules/messaging/message-import-manager/types/message.type';
import { MicrosoftFetchByBatchService } from './microsoft-fetch-by-batch.service';
import { MicrosoftMessagesImportErrorHandler } from './microsoft-messages-import-error-handler.service';
type ConnectedAccountType = Pick<ConnectedAccountEntity, 'id' | 'provider' | 'handle' | 'handleAliases'>;
export declare class MicrosoftGetMessagesService {
    private readonly microsoftFetchByBatchService;
    private readonly microsoftMessagesImportErrorHandler;
    private readonly logger;
    constructor(microsoftFetchByBatchService: MicrosoftFetchByBatchService, microsoftMessagesImportErrorHandler: MicrosoftMessagesImportErrorHandler);
    getMessages(messageIds: string[], connectedAccount: ConnectedAccountType): Promise<MessageWithParticipants[]>;
    formatBatchResponsesAsMessages(batchResponses: MicrosoftGraphBatchResponse[], connectedAccount: ConnectedAccountType): MessageWithParticipants[];
    private formatBatchResponseAsMessages;
    private parseBatchResponse;
}
export {};
