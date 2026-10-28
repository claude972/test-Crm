import { type ObjectRecordCreateEvent, type ObjectRecordDeleteEvent, type ObjectRecordUpdateEvent } from 'kovaa-lab-shared/database-events';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type BlocklistWorkspaceEntity } from 'src/modules/blocklist/standard-objects/blocklist.workspace-entity';
export declare class MessagingBlocklistListener {
    private readonly messageQueueService;
    constructor(messageQueueService: MessageQueueService);
    handleCreatedEvent(payload: WorkspaceEventBatch<ObjectRecordCreateEvent<BlocklistWorkspaceEntity>>): Promise<void>;
    handleDeletedEvent(payload: WorkspaceEventBatch<ObjectRecordDeleteEvent<BlocklistWorkspaceEntity>>): Promise<void>;
    handleUpdatedEvent(payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<BlocklistWorkspaceEntity>>): Promise<void>;
}
