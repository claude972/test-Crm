import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
import { CalendarEventParticipantService } from 'src/modules/calendar/calendar-event-participant-manager/services/calendar-event-participant.service';
import { type FetchedCalendarEvent } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
export declare class CalendarSaveEventsService {
    private readonly workspaceOrmManager;
    private readonly calendarEventParticipantService;
    private readonly featureFlagService;
    private readonly calendarChannelRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarEventParticipantService: CalendarEventParticipantService, featureFlagService: FeatureFlagService, calendarChannelRepository: WorkspaceScopedRepository<CalendarChannelEntity>);
    saveCalendarEventsAndEnqueueContactCreationJob(fetchedCalendarEvents: FetchedCalendarEvent[], calendarChannel: CalendarChannelEntity, connectedAccount: ConnectedAccountEntity, workspaceId: string): Promise<{
        calendarEventIds: string[];
    }>;
    private findLinkCandidateAssociations;
}
