import { Repository } from 'typeorm';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessageChannelSyncStatusService } from 'src/modules/messaging/common/services/message-channel-sync-status.service';
export type MessagingOngoingStaleJobData = {
    workspaceId: string;
};
export declare class MessagingOngoingStaleJob {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageChannelSyncStatusService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageChannelSyncStatusService: MessageChannelSyncStatusService);
    handle(data: MessagingOngoingStaleJobData): Promise<void>;
}
