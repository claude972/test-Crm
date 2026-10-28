import { Repository } from 'typeorm';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessageImportExceptionHandlerService } from 'src/modules/messaging/message-import-manager/services/messaging-import-exception-handler.service';
import { MessagingMessageListFetchService } from 'src/modules/messaging/message-import-manager/services/messaging-message-list-fetch.service';
import { MessagingMonitoringService } from 'src/modules/messaging/monitoring/services/messaging-monitoring.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
export type MessagingMessageListFetchJobData = {
    messageChannelId: string;
    workspaceId: string;
};
export declare class MessagingMessageListFetchJob {
    private readonly messagingMessageListFetchService;
    private readonly messagingMonitoringService;
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageImportErrorHandlerService;
    constructor(messagingMessageListFetchService: MessagingMessageListFetchService, messagingMonitoringService: MessagingMonitoringService, workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageImportErrorHandlerService: MessageImportExceptionHandlerService);
    handle(data: MessagingMessageListFetchJobData): Promise<void>;
}
