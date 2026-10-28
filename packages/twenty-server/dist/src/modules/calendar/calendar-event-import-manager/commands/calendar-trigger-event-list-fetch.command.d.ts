import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
type CalendarTriggerEventListFetchCommandOptions = {
    workspaceId: string;
    calendarChannelId?: string;
};
export declare class CalendarTriggerEventListFetchCommand extends CommandRunner {
    private readonly workspaceOrmManager;
    private readonly calendarChannelRepository;
    private readonly messageQueueService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, calendarChannelRepository: Repository<CalendarChannelEntity>, messageQueueService: MessageQueueService);
    run(_passedParam: string[], options: CalendarTriggerEventListFetchCommandOptions): Promise<void>;
    parseWorkspaceId(value: string): string;
    parseCalendarChannelId(value: string): string;
}
export {};
