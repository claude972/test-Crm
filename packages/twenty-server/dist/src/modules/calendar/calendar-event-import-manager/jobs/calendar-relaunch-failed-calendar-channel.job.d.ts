import { Repository } from 'typeorm';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
export type CalendarRelaunchFailedCalendarChannelJobData = {
    workspaceId: string;
    calendarChannelId: string;
};
export declare class CalendarRelaunchFailedCalendarChannelJob {
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>);
    handle(data: CalendarRelaunchFailedCalendarChannelJobData): Promise<void>;
}
