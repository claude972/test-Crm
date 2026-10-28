import { type ObjectRecordCreateEvent } from 'kovaa-lab-shared/database-events';
import { Repository } from 'typeorm';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type BlocklistWorkspaceEntity } from 'src/modules/blocklist/standard-objects/blocklist.workspace-entity';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';
export type BlocklistItemDeleteMessagesJobData = WorkspaceEventBatch<ObjectRecordCreateEvent<BlocklistWorkspaceEntity>>;
export declare class BlocklistItemDeleteMessagesJob {
    private readonly threadCleanerService;
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly connectedAccountRepository;
    private readonly userWorkspaceRepository;
    constructor(threadCleanerService: MessagingMessageCleanerService, workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, connectedAccountRepository: Repository<ConnectedAccountEntity>, userWorkspaceRepository: Repository<UserWorkspaceEntity>);
    handle(data: BlocklistItemDeleteMessagesJobData): Promise<void>;
    private findWorkspaceMessageChannels;
    private findWorkspaceMemberMessageChannels;
    private deleteMessagesForMessageChannels;
}
