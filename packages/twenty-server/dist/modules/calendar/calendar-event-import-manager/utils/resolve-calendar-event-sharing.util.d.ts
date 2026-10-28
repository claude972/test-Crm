import { type ConnectedAccountProvider } from 'kovaa-lab-shared/types';
import { type CalendarChannelEventAssociationWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-channel-event-association.workspace-entity';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
type SharedAssociation = Pick<CalendarChannelEventAssociationWorkspaceEntity, 'calendarChannelId' | 'calendarEventId' | 'eventExternalId'>;
export declare const resolveCalendarEventSharing: ({ provider, fetchedCalendarEvents, existingEventExternalIds, sharedAssociations, iCalUidByCalendarEventId, isCalendarEventSharingEnabled, }: {
    provider: ConnectedAccountProvider;
    fetchedCalendarEvents: FetchedCalendarEvent[];
    existingEventExternalIds: Set<string>;
    sharedAssociations: SharedAssociation[];
    iCalUidByCalendarEventId: Map<string, string | null>;
    isCalendarEventSharingEnabled: boolean;
}) => {
    calendarEventIdToLinkByEventExternalId: Map<string, string>;
    otherChannelIdsByCalendarEventId: Map<string, string[]>;
};
export {};
