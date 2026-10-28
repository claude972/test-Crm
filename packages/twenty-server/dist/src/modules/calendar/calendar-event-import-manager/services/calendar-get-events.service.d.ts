import { CalDavGetEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/services/caldav-get-events.service';
import { GoogleCalendarGetEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/google-calendar/services/google-calendar-get-events.service';
import { MicrosoftCalendarGetEventsService } from 'src/modules/calendar/calendar-event-import-manager/drivers/microsoft-calendar/services/microsoft-calendar-get-events.service';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
export type GetCalendarEventsResponse = {
    calendarEventIds: string[];
    calendarEventIdsToDelete: string[];
    nextSyncCursor: string;
};
export declare class CalendarGetCalendarEventsService {
    private readonly googleCalendarGetEventsService;
    private readonly microsoftCalendarGetEventsService;
    private readonly caldavCalendarGetEventsService;
    constructor(googleCalendarGetEventsService: GoogleCalendarGetEventsService, microsoftCalendarGetEventsService: MicrosoftCalendarGetEventsService, caldavCalendarGetEventsService: CalDavGetEventsService);
    getCalendarEvents(connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'accessToken' | 'refreshToken' | 'id' | 'connectionParameters' | 'handle' | 'workspaceId'>, syncCursor?: string): Promise<GetCalendarEventsResponse>;
}
