import { CalDavImportEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-import-events.service';
import { GoogleCalendarImportEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-import-events.service';
import { MicrosoftCalendarImportEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/microsoft-calendar/services/microsoft-calendar-import-events.service';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
export declare class CalendarImportEventsService {
    private readonly googleCalendarImportEventsService;
    private readonly microsoftCalendarImportEventsService;
    private readonly caldavCalendarImportEventsService;
    constructor(googleCalendarImportEventsService: GoogleCalendarImportEventsService, microsoftCalendarImportEventsService: MicrosoftCalendarImportEventsService, caldavCalendarImportEventsService: CalDavImportEventsService);
    getCalendarEvents(connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'id'>, eventExternalIds: string[]): Promise<FetchedCalendarEvent[]>;
}
