import { type CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
export type ComparableCalendarEvent = Pick<CalendarEventWorkspaceEntity, 'id' | 'iCalUid' | 'title' | 'description' | 'startsAt' | 'endsAt' | 'location' | 'isFullDay' | 'isCanceled' | 'conferenceSolution' | 'conferenceLink'>;
export declare const hasCalendarEventChanged: ({ existingCalendarEvent, calendarEvent, }: {
    existingCalendarEvent: ComparableCalendarEvent;
    calendarEvent: Omit<ComparableCalendarEvent, "id">;
}) => boolean;
