import { Repository } from 'typeorm';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { CalendarEventCleanerService } from 'src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service';
import { CalendarEventImportErrorHandlerService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-event-import-exception-handler.service';
import { CalendarGetCalendarEventsService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-get-events.service';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export declare class CalendarFetchEventsService {
    private readonly cacheStorage;
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    private readonly calendarChannelSyncStatusService;
    private readonly getCalendarEventsService;
    private readonly calendarEventImportErrorHandlerService;
    private readonly calendarEventCleanerService;
    private readonly logger;
    constructor(cacheStorage: CacheStorageService, workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>, calendarChannelSyncStatusService: CalendarChannelSyncStatusService, getCalendarEventsService: CalendarGetCalendarEventsService, calendarEventImportErrorHandlerService: CalendarEventImportErrorHandlerService, calendarEventCleanerService: CalendarEventCleanerService);
    fetchCalendarEvents(calendarChannel: CalendarChannelEntity, connectedAccount: ConnectedAccountEntity, workspaceId: string): Promise<void>;
}
