import { Repository } from 'typeorm';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingMessagesImportService } from 'src/modules/messaging/message-import-manager/services/messaging-messages-import.service';
import { MessagingMonitoringService } from 'src/modules/messaging/monitoring/services/messaging-monitoring.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
export type MessagingMessagesImportJobData = {
    messageChannelId: string;
    workspaceId: string;
};
export declare class MessagingMessagesImportJob {
    private readonly messagingMessagesImportService;
    private readonly messagingMonitoringService;
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    constructor(messagingMessagesImportService: MessagingMessagesImportService, messagingMonitoringService: MessagingMonitoringService, workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>);
    handle(data: MessagingMessagesImportJobData): Promise<void>;
}
