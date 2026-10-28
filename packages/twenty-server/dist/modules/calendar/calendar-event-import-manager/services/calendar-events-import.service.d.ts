import { Repository } from 'typeorm';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { type CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { BlocklistRepository } from 'src/modules/blocklist/repositories/blocklist.repository';
import { CalendarEventCleanerService } from 'src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service';
import { CalendarEventImportErrorHandlerService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service';
import { CalendarImportEventsService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-import-events.service';
import { CalendarSaveEventsService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-save-events.service';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';
import { EmailAliasManagerService } from 'src/modules/connected-account/email-alias-manager/services/email-alias-manager.service';
export declare class CalendarEventsImportService {
    private readonly cacheStorage;
    private readonly workspaceOrmManager;
    private readonly blocklistRepository;
    private readonly calendarEventCleanerService;
    private readonly calendarChannelSyncStatusService;
    private readonly calendarSaveEventsService;
    private readonly calendarEventImportErrorHandlerService;
    private readonly calendarImportEventsService;
    private readonly emailAliasManagerService;
    private readonly userWorkspaceRepository;
    constructor(cacheStorage: CacheStorageService, workspaceOrmManager: WorkspaceOrmManager, blocklistRepository: BlocklistRepository, calendarEventCleanerService: CalendarEventCleanerService, calendarChannelSyncStatusService: CalendarChannelSyncStatusService, calendarSaveEventsService: CalendarSaveEventsService, calendarEventImportErrorHandlerService: CalendarEventImportErrorHandlerService, calendarImportEventsService: CalendarImportEventsService, emailAliasManagerService: EmailAliasManagerService, userWorkspaceRepository: Repository<UserWorkspaceEntity>);
    processCalendarEventsImport(calendarChannel: CalendarChannelEntity, connectedAccount: ConnectedAccountEntity, workspaceId: string): Promise<void>;
}
