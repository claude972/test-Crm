import { Repository } from 'typeorm';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';
export type CalendarOngoingStaleJobData = {
    workspaceId: string;
};
export declare class CalendarOngoingStaleJob {
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    private readonly calendarChannelSyncStatusService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>, calendarChannelSyncStatusService: CalendarChannelSyncStatusService);
    handle(data: CalendarOngoingStaleJobData): Promise<void>;
}
