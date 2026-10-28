import { type ObjectRecordDeleteEvent } from 'kovaa-lab-shared/database-events';
import { type Repository } from 'typeorm';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { type BlocklistWorkspaceEntity } from 'src/modules/blocklist/standard-objects/blocklist.workspace-entity';
import { CalendarChannelSyncStatusService } from 'src/modules/calendar/common/services/calendar-channel-sync-status.service';
export type BlocklistReimportCalendarEventsJobData = WorkspaceEventBatch<ObjectRecordDeleteEvent<BlocklistWorkspaceEntity>>;
export declare class BlocklistReimportCalendarEventsJob {
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    private readonly userWorkspaceRepository;
    private readonly calendarChannelSyncStatusService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>, userWorkspaceRepository: Repository<UserWorkspaceEntity>, calendarChannelSyncStatusService: CalendarChannelSyncStatusService);
    handle(data: BlocklistReimportCalendarEventsJobData): Promise<void>;
    private findWorkspaceMemberUserWorkspaceId;
    private findCalendarChannelIdsToReset;
}
