import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type ConnectedAccountDeletedEvent } from 'src/engine/metadata-modules/connected-account/types/connected-account-deleted.type';
import { CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
export declare class CalendarEventCleanerConnectedAccountListener {
    private readonly calendarQueueService;
    constructor(calendarQueueService: MessageQueueService);
    handleDeletedEvent(batchEvent: CustomWorkspaceEventBatch<ConnectedAccountDeletedEvent>): Promise<void>;
}
