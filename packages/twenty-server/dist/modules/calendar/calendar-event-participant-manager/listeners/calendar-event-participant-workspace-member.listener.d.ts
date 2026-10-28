import { type ObjectRecordCreateEvent, type ObjectRecordUpdateEvent } from 'kovaa-lab-shared/database-events';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
export declare class CalendarEventParticipantWorkspaceMemberListener {
    private readonly messageQueueService;
    constructor(messageQueueService: MessageQueueService);
    handleCreatedEvent(payload: WorkspaceEventBatch<ObjectRecordCreateEvent<WorkspaceMemberWorkspaceEntity>>): Promise<void>;
    handleUpdatedEvent(payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WorkspaceMemberWorkspaceEntity>>): Promise<void>;
}
