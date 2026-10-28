import { Repository } from 'typeorm';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { CalendarEventsImportService } from 'src/modules/calendar/calendar-event-import-manager/services/calendar-events-import.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export type CalendarEventsImportJobData = {
    calendarChannelId: string;
    workspaceId: string;
};
export declare class CalendarEventsImportJob {
    private readonly calendarEventsImportService;
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    constructor(calendarEventsImportService: CalendarEventsImportService, workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>);
    handle(data: CalendarEventsImportJobData): Promise<void>;
}
