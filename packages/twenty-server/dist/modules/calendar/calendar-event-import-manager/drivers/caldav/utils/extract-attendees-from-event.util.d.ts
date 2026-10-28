import type * as ical from 'node-ical';
import { type FetchedCalendarEventParticipant } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
export declare const extractAttendeesFromEvent: (event: ical.VEvent) => FetchedCalendarEventParticipant[];
