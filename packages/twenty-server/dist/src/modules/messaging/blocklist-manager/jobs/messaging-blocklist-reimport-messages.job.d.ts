import { type ObjectRecordDeleteEvent } from 'kovaa-lab-shared/database-events';
import { Repository } from 'typeorm';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type BlocklistWorkspaceEntity } from 'src/modules/blocklist/standard-objects/blocklist.workspace-entity';
import { MessageChannelSyncStatusService } from 'src/modules/messaging/common/services/message-channel-sync-status.service';
export type BlocklistReimportMessagesJobData = WorkspaceEventBatch<ObjectRecordDeleteEvent<BlocklistWorkspaceEntity>>;
export declare class BlocklistReimportMessagesJob {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly connectedAccountRepository;
    private readonly userWorkspaceRepository;
    private readonly messagingChannelSyncStatusService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, connectedAccountRepository: Repository<ConnectedAccountEntity>, userWorkspaceRepository: Repository<UserWorkspaceEntity>, messagingChannelSyncStatusService: MessageChannelSyncStatusService);
    handle(data: BlocklistReimportMessagesJobData): Promise<void>;
    private findWorkspaceMemberConnectedAccountIds;
    private findMessageChannelIdsToReset;
}
