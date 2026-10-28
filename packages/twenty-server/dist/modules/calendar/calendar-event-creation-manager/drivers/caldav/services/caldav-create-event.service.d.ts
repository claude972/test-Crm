import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type CalendarEventCreationDriver } from 'src/modules/calendar/calendar-event-creation-manager/interfaces/calendar-event-creation-driver.interface';
import { type CalendarEventToCreate } from 'src/modules/calendar/calendar-event-creation-manager/types/calendar-event-to-create.type';
import { CalDavClientProvider } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/providers/caldav-client.provider';
import { CalDavFetchEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-fetch-events.service';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
export declare class CalDavCreateEventService implements CalendarEventCreationDriver {
    private readonly calDavClientProvider;
    private readonly calDavFetchEventsService;
    constructor(calDavClientProvider: CalDavClientProvider, calDavFetchEventsService: CalDavFetchEventsService);
    createCalendarEvent(input: CalendarEventToCreate, connectedAccount: Pick<ConnectedAccountEntity, 'id' | 'provider'>): Promise<FetchedCalendarEvent>;
}
