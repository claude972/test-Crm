import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export declare const CALENDAR_EVENT_LIST_FETCH_CRON_PATTERN = "*/5 * * * *";
export declare class CalendarEventListFetchCronJob {
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    private readonly calendarChannelRepository;
    private readonly logger;
    constructor(messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService, calendarChannelRepository: Repository<CalendarChannelEntity>);
    handle(): Promise<void>;
}
