import { type ObjectRecordCreateEvent, type ObjectRecordDeleteEvent, type ObjectRecordUpdateEvent } from 'kovaa-lab-shared/database-events';
import { Repository } from 'typeorm';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PersonHandleFieldService } from 'src/modules/match-participant/person-handle-field/person-handle-field.service';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
export declare class MessageParticipantPersonListener {
    private readonly messageQueueService;
    private readonly messageChannelRepository;
    private readonly personHandleFieldService;
    constructor(messageQueueService: MessageQueueService, messageChannelRepository: Repository<MessageChannelEntity>, personHandleFieldService: PersonHandleFieldService);
    handleCreatedEvent(payload: WorkspaceEventBatch<ObjectRecordCreateEvent<PersonWorkspaceEntity>>): Promise<void>;
    handleUpdatedEvent(payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<PersonWorkspaceEntity>>): Promise<void>;
    private enqueueMatching;
    private buildPersonHandleMatching;
    handleDestroyedEvent(payload: WorkspaceEventBatch<ObjectRecordDeleteEvent<PersonWorkspaceEntity>>): Promise<void>;
}
