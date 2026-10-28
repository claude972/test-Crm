import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
export declare const CALENDAR_RELAUNCH_FAILED_CALENDAR_CHANNELS_CRON_PATTERN = "*/30 * * * *";
export declare class CalendarRelaunchFailedCalendarChannelsCronJob {
    private readonly workspaceRepository;
    private readonly calendarChannelRepository;
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    constructor(workspaceRepository: Repository<WorkspaceEntity>, calendarChannelRepository: Repository<CalendarChannelEntity>, messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
}
