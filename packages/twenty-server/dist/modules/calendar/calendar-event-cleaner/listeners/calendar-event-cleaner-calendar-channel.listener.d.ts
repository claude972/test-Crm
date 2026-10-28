import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { type CalendarChannelDeletedEvent } from 'src/engine/metadata-modules/calendar-channel/types/calendar-channel-deleted.type';
import { CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
export declare class CalendarEventCleanerCalendarChannelListener {
    private readonly calendarQueueService;
    constructor(calendarQueueService: MessageQueueService);
    handleDeletedEvent(batchEvent: CustomWorkspaceEventBatch<CalendarChannelDeletedEvent>): Promise<void>;
}
