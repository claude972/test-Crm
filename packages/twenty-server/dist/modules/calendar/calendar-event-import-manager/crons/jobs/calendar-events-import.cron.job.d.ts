import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { CalendarChannelEntity } from 'src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity';
export declare const CALENDAR_EVENTS_IMPORT_CRON_PATTERN = "*/1 * * * *";
export declare class CalendarEventsImportCronJob {
    private readonly messageQueueService;
    private readonly calendarChannelRepository;
    private readonly exceptionHandlerService;
    private readonly logger;
    constructor(messageQueueService: MessageQueueService, calendarChannelRepository: Repository<CalendarChannelEntity>, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
}
