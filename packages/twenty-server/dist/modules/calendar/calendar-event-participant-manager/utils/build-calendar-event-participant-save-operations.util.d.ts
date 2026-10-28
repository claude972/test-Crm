import { type CalendarEventChannelRole } from 'src/modules/calendar/calendar-event-import-manager/types/calendar-event-channel-role.type';
import { type CalendarEventParticipantSaveOperations } from 'src/modules/calendar/calendar-event-participant-manager/types/calendar-event-participant-save-operations.type';
import { type CalendarEventParticipantWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity';
import { type FetchedParticipantWithCalendarEventId } from 'src/modules/calendar/common/types/fetched-participant-with-calendar-event-id.type';
export declare const buildCalendarEventParticipantSaveOperations: ({ fetchedParticipants, existingParticipants, channelRoleByCalendarEventId, channelHandles, }: {
    fetchedParticipants: FetchedParticipantWithCalendarEventId[];
    existingParticipants: CalendarEventParticipantWorkspaceEntity[];
    channelRoleByCalendarEventId: Map<string, CalendarEventChannelRole>;
    channelHandles: string[];
}) => CalendarEventParticipantSaveOperations;
