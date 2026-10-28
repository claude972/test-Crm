import { type CalendarEventChannelRole } from 'src/modules/calendar/calendar-event-import-manager/types/calendar-event-channel-role.type';
import { type CalendarEventSharingChannel } from 'src/modules/calendar/calendar-event-import-manager/types/calendar-event-sharing-channel.type';
export declare const computeCalendarEventChannelRole: ({ organizerHandle, channelHandles, otherChannelIds, calendarChannelById, }: {
    organizerHandle: string;
    channelHandles: string[];
    otherChannelIds: string[];
    calendarChannelById: Map<string, CalendarEventSharingChannel>;
}) => CalendarEventChannelRole;
