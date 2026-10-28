import { Repository } from 'typeorm';
import { MessageChannelSyncStatus } from 'kovaa-lab-shared/types';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { AccountsToReconnectService } from 'src/modules/connected-account/services/accounts-to-reconnect.service';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { WorkspaceEventBroadcaster } from 'src/engine/subscriptions/workspace-event-broadcaster/workspace-event-broadcaster.service';
export declare class MessageChannelSyncStatusService {
    private readonly cacheStorage;
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageFolderRepository;
    private readonly connectedAccountRepository;
    private readonly userWorkspaceRepository;
    private readonly accountsToReconnectService;
    private readonly metricsService;
    private readonly workspaceEventBroadcaster;
    private readonly logger;
    constructor(cacheStorage: CacheStorageService, workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>, connectedAccountRepository: Repository<ConnectedAccountEntity>, userWorkspaceRepository: Repository<UserWorkspaceEntity>, accountsToReconnectService: AccountsToReconnectService, metricsService: MetricsService, workspaceEventBroadcaster: WorkspaceEventBroadcaster);
    markAsMessagesListFetchPending(messageChannelIds: string[], workspaceId: string, preserveSyncStageStartedAt?: boolean): Promise<void>;
    markAsMessagesImportPending(messageChannelIds: string[], workspaceId: string, preserveSyncStageStartedAt?: boolean): Promise<void>;
    resetAndMarkAsMessagesListFetchPending(messageChannelIds: string[], workspaceId: string): Promise<void>;
    resetSyncStageStartedAt(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsMessagesListFetchScheduled(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsMessagesListFetchScheduledIfPending(messageChannelIds: string[], workspaceId: string): Promise<string[]>;
    markAsMessagesListFetchOngoing(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsMessageSyncCompleted(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsMessagesImportScheduled(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsMessagesImportOngoing(messageChannelIds: string[], workspaceId: string): Promise<void>;
    markAsFailed({ messageChannelIds, workspaceId, syncStatus, authFailedReason, }: {
        messageChannelIds: string[];
        workspaceId: string;
        syncStatus: MessageChannelSyncStatus.FAILED_INSUFFICIENT_PERMISSIONS | MessageChannelSyncStatus.FAILED_UNKNOWN;
        authFailedReason?: string | null;
    }): Promise<void>;
    getImportProgress({ messageChannelId, workspaceId, }: {
        messageChannelId: string;
        workspaceId: string;
    }): Promise<number | null>;
    private clearImportProgress;
    private updateMessageChannels;
    private broadcastMessageChannelsUpdated;
    private addToAccountsToReconnect;
}
