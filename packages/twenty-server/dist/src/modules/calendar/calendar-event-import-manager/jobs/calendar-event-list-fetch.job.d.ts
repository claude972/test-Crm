import { Repository } from 'typeorm';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { CalendarFetchEventsService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-fetch-events.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export type CalendarEventListFetchJobData = {
    calendarChannelId: string;
    workspaceId: string;
};
export declare class CalendarEventListFetchJob {
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    private readonly calendarFetchEventsService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>, calendarFetchEventsService: CalendarFetchEventsService);
    handle(data: CalendarEventListFetchJobData): Promise<void>;
}
