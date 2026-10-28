import { Repository } from 'typeorm';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { AccountsToReconnectService } from 'src/modules/connected-account/services/accounts-to-reconnect.service';
export declare class CalendarChannelSyncStatusService {
    private readonly workspaceOrmManager;
    private readonly cacheStorage;
    private readonly calendarChannelRepository;
    private readonly connectedAccountRepository;
    private readonly userWorkspaceRepository;
    private readonly accountsToReconnectService;
    private readonly metricsService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, cacheStorage: CacheStorageService, calendarChannelRepository: Repository<CalendarChannelEntity>, connectedAccountRepository: Repository<ConnectedAccountEntity>, userWorkspaceRepository: Repository<UserWorkspaceEntity>, accountsToReconnectService: AccountsToReconnectService, metricsService: MetricsService);
    markAsCalendarEventListFetchPending(calendarChannelIds: string[], workspaceId: string, preserveSyncStageStartedAt?: boolean): Promise<void>;
    markAsCalendarEventListFetchOngoing(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    resetAndMarkAsCalendarEventListFetchPending(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    resetSyncStageStartedAt(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    markAsCalendarEventsImportPending(calendarChannelIds: string[], workspaceId: string, preserveSyncStageStartedAt?: boolean): Promise<void>;
    markAsCalendarEventsImportOngoing(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    markAsCalendarEventSyncCompleted(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    markAsFailedUnknownAndFlushCalendarEventsToImport(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    markAsFailedInsufficientPermissionsAndFlushCalendarEventsToImport(calendarChannelIds: string[], workspaceId: string): Promise<void>;
    private addToAccountsToReconnect;
}
