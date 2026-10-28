import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { ConnectedAccountRefreshAccessTokenException } from 'src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception';
import { type KovaaLabCRMOrmException } from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { MessageChannelSyncStatusService } from 'src/modules/messaging/common/services/message-channel-sync-status.service';
import { MessageImportDriverException } from 'src/modules/messaging/message-import-manager/drivers/exceptions/message-import-driver.exception';
import { MessagingMonitoringService } from 'src/modules/messaging/monitoring/services/messaging-monitoring.service';
export declare enum MessageImportSyncStep {
    MESSAGE_LIST_FETCH = "MESSAGE_LIST_FETCH",
    MESSAGES_IMPORT_PENDING = "MESSAGES_IMPORT_PENDING",
    MESSAGES_IMPORT_ONGOING = "MESSAGES_IMPORT_ONGOING"
}
export declare class MessageImportExceptionHandlerService {
    private readonly messageChannelRepository;
    private readonly messageChannelSyncStatusService;
    private readonly exceptionHandlerService;
    private readonly messagingMonitoringService;
    constructor(messageChannelRepository: WorkspaceScopedRepository<MessageChannelEntity>, messageChannelSyncStatusService: MessageChannelSyncStatusService, exceptionHandlerService: ExceptionHandlerService, messagingMonitoringService: MessagingMonitoringService);
    handleDriverException(exception: MessageImportDriverException | Error | KovaaLabCRMOrmException | ConnectedAccountRefreshAccessTokenException, syncStep: MessageImportSyncStep, messageChannel: Pick<MessageChannelEntity, 'id' | 'throttleFailureCount' | 'connectedAccountId'>, workspaceId: string): Promise<void>;
    private handleSyncCursorErrorException;
    private handleTemporaryException;
    private handleInsufficientPermissionsException;
    private handleUnknownException;
    private handleNotFoundException;
}
