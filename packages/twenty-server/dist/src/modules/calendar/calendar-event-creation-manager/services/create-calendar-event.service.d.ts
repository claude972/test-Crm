import { CalDavCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/caldav/services/caldav-create-event.service';
import { GoogleCalendarCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/google-calendar/services/google-calendar-create-event.service';
import { MicrosoftCalendarCreateEventService } from 'src/modules/calendar/calendar-event-creation-manager/drivers/microsoft-calendar/services/microsoft-calendar-create-event.service';
import { CalendarSaveEventsService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-save-events.service';
import { type ComposedCalendarEvent } from 'src/modules/calendar/calendar-event-creation-manager/types/composed-calendar-event.type';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
export declare class CreateCalendarEventService {
    private readonly googleCalendarCreateEventService;
    private readonly microsoftCalendarCreateEventService;
    private readonly calDavCreateEventService;
    private readonly calendarSaveEventsService;
    private readonly logger;
    constructor(googleCalendarCreateEventService: GoogleCalendarCreateEventService, microsoftCalendarCreateEventService: MicrosoftCalendarCreateEventService, calDavCreateEventService: CalDavCreateEventService, calendarSaveEventsService: CalendarSaveEventsService);
    createComposedCalendarEvent(data: ComposedCalendarEvent): Promise<FetchedCalendarEvent>;
    persistCalendarEvent(createdEvent: FetchedCalendarEvent, data: ComposedCalendarEvent, workspaceId: string): Promise<string | null>;
}
