import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingMonitoringService } from 'src/modules/messaging/monitoring/services/messaging-monitoring.service';
export declare const MESSAGING_MESSAGE_CHANNEL_SYNC_STATUS_MONITORING_CRON_PATTERN = "2/10 * * * *";
export declare class MessagingMessageChannelSyncStatusMonitoringCronJob {
    private readonly workspaceRepository;
    private readonly messagingMonitoringService;
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly exceptionHandlerService;
    constructor(workspaceRepository: Repository<WorkspaceEntity>, messagingMonitoringService: MessagingMonitoringService, workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
}
