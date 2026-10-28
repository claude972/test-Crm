import { type ObjectRecordCreateEvent, type ObjectRecordDeleteEvent, type ObjectRecordUpdateEvent } from 'kovaa-lab-shared/database-events';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
export declare class CalendarEventParticipantPersonListener {
    private readonly messageQueueService;
    constructor(messageQueueService: MessageQueueService);
    handleCreatedEvent(payload: WorkspaceEventBatch<ObjectRecordCreateEvent<PersonWorkspaceEntity>>): Promise<void>;
    handleUpdatedEvent(payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<PersonWorkspaceEntity>>): Promise<void>;
    handleDestroyedEvent(payload: WorkspaceEventBatch<ObjectRecordDeleteEvent<PersonWorkspaceEntity>>): Promise<void>;
}
