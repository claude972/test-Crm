import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/kovaa-lab-orm/types/workspace-transaction-scope.type';
import { type CalendarEventParticipantSaveOperations } from 'src/modules/calendar/calendar-event-participant-manager/types/calendar-event-participant-save-operations.type';
import { type CalendarEventParticipantWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event-participant.workspace-entity';
import { type FetchedCalendarEventParticipant } from 'src/modules/calendar/common/types/fetched-calendar-event.type';
import { MatchParticipantService } from 'src/modules/match-participant/match-participant.service';
export declare class CalendarEventParticipantService {
    private readonly workspaceOrmManager;
    private readonly matchParticipantService;
    private readonly messageQueueService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, matchParticipantService: MatchParticipantService<CalendarEventParticipantWorkspaceEntity>, messageQueueService: MessageQueueService);
    findCalendarEventParticipantsByCalendarEventIds({ calendarEventIds, }: {
        calendarEventIds: string[];
    }): Promise<CalendarEventParticipantWorkspaceEntity[]>;
    writeCalendarEventParticipants({ operations, transactionScope, }: {
        operations: CalendarEventParticipantSaveOperations;
        transactionScope: WorkspaceTransactionScope;
    }): Promise<void>;
    matchParticipantsAndEnqueueContactCreationJob({ savedParticipantIds, participantsOfLinkedEvents, calendarChannel, connectedAccount, workspaceId, calendarEventIds, }: {
        savedParticipantIds: string[];
        participantsOfLinkedEvents: FetchedCalendarEventParticipant[];
        calendarChannel: CalendarChannelEntity;
        connectedAccount: ConnectedAccountEntity;
        workspaceId: string;
        calendarEventIds: string[];
    }): Promise<void>;
}
