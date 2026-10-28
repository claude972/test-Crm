import { type ObjectRecordCreateEvent } from 'kovaa-lab-shared/database-events';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type BlocklistWorkspaceEntity } from 'src/modules/blocklist/standard-objects/blocklist.workspace-entity';
import { CalendarEventCleanerService } from 'src/modules/calendar/calendar-event-cleaner/services/calendar-event-cleaner.service';
export type BlocklistItemDeleteCalendarEventsJobData = WorkspaceEventBatch<ObjectRecordCreateEvent<BlocklistWorkspaceEntity>>;
export declare class BlocklistItemDeleteCalendarEventsJob {
    private readonly calendarEventCleanerService;
    constructor(calendarEventCleanerService: CalendarEventCleanerService);
    handle(data: BlocklistItemDeleteCalendarEventsJobData): Promise<void>;
}
