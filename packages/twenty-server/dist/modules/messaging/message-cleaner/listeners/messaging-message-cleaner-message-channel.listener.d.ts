import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type MessageChannelDeletedEvent } from 'src/engine/metadata-modules/message-channel/types/message-channel-deleted.type';
import { CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
export declare class MessagingMessageCleanerMessageChannelListener {
    private readonly messageQueueService;
    constructor(messageQueueService: MessageQueueService);
    handleDeletedEvent(batchEvent: CustomWorkspaceEventBatch<MessageChannelDeletedEvent>): Promise<void>;
}
