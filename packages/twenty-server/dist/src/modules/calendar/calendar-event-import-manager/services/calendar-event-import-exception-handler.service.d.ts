import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { ConnectedAccountRefreshAccessTokenException } from 'src/engine/metadata-modules/connected-account/exceptions/connected-account-refresh-tokens.exception';
import { type KovaaLabCRMOrmException } from 'src/engine/kovaa-lab-orm/exceptions/kovaa-lab-orm.exception';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { type CalendarEventImportDriverException } from 'src/modules/calendar/calendar-event-import-manager/drivers/exceptions/calendar-event-import-driver.exception';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';
export declare enum CalendarEventImportSyncStep {
    CALENDAR_EVENT_LIST_FETCH = "CALENDAR_EVENT_LIST_FETCH",
    CALENDAR_EVENTS_IMPORT = "CALENDAR_EVENTS_IMPORT"
}
export declare class CalendarEventImportErrorHandlerService {
    private readonly calendarChannelRepository;
    private readonly calendarChannelSyncStatusService;
    private readonly exceptionHandlerService;
    private readonly logger;
    constructor(calendarChannelRepository: WorkspaceScopedRepository<CalendarChannelEntity>, calendarChannelSyncStatusService: CalendarChannelSyncStatusService, exceptionHandlerService: ExceptionHandlerService);
    handleDriverException(exception: CalendarEventImportDriverException | KovaaLabCRMOrmException | ConnectedAccountRefreshAccessTokenException, syncStep: CalendarEventImportSyncStep, calendarChannel: Pick<CalendarChannelEntity, 'id' | 'throttleFailureCount'>, workspaceId: string): Promise<void>;
    private handleSyncCursorErrorException;
    private handleTemporaryException;
    private handleInsufficientPermissionsException;
    private handleUnknownException;
    private handleNotFoundException;
}
