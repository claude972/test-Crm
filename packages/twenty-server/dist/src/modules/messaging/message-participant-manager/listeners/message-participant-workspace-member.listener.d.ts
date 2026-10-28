import { Repository } from 'typeorm';
import { type ObjectRecordCreateEvent, type ObjectRecordUpdateEvent } from 'kovaa-lab-shared/database-events';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';
export declare class MessageParticipantWorkspaceMemberListener {
    private readonly messageQueueService;
    private readonly workspaceRepository;
    constructor(messageQueueService: MessageQueueService, workspaceRepository: Repository<WorkspaceEntity>);
    handleCreatedEvent(payload: WorkspaceEventBatch<ObjectRecordCreateEvent<WorkspaceMemberWorkspaceEntity>>): Promise<void>;
    handleUpdatedEvent(payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WorkspaceMemberWorkspaceEntity>>): Promise<void>;
}
