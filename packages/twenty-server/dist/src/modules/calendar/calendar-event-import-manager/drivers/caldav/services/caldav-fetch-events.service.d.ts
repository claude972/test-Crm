import { type DAVCalendar, type DAVClient } from 'tsdav';
import { type CalDavSyncCursor } from 'src/modules/calendar/calendar-event-import-manager/drivers/caldav/types/caldav-sync-cursor.type';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
export declare class CalDavFetchEventsService {
    private readonly logger;
    private static readonly PAST_DAYS_WINDOW;
    private static readonly FUTURE_DAYS_WINDOW;
    listEventCalendars(client: DAVClient): Promise<DAVCalendar[]>;
    fetchChangedEventHrefs(client: DAVClient, syncCursor?: CalDavSyncCursor): Promise<{
        changedHrefs: string[];
        cancelledHrefs: string[];
        syncCursor: CalDavSyncCursor;
    }>;
    fetchEventsByHrefs(client: DAVClient, eventHrefs: string[]): Promise<FetchedCalendarEvent[]>;
    private fetchCalendarObjects;
    private resolveCollectionUrl;
    private syncCalendar;
    private fetchHrefsViaSyncCollection;
    private runSyncCollection;
    private fetchHrefsViaCtagEtag;
    private mergeSyncCursor;
    private fetchEtagsByHref;
}
