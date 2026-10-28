import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
export declare class CalendarEventCleanerService {
    private readonly workspaceOrmManager;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager);
    deleteCalendarChannelEventAssociationsByChannelId({ workspaceId, calendarChannelId, }: {
        workspaceId: string;
        calendarChannelId: string;
    }): Promise<void>;
    deleteOrphanedCalendarEvents({ calendarEventIds, workspaceId, }: {
        calendarEventIds: string[];
        workspaceId: string;
    }): Promise<void>;
    cleanWorkspaceCalendarEvents(workspaceId: string): Promise<void>;
}
