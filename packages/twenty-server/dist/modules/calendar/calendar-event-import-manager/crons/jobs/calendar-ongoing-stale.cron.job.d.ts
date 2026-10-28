import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export declare const CALENDAR_ONGOING_STALE_CRON_PATTERN = "0 * * * *";
export declare class CalendarOngoingStaleCronJob {
    private readonly calendarChannelRepository;
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    constructor(calendarChannelRepository: Repository<CalendarChannelEntity>, messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
    private findStaleWorkspaceIds;
}
