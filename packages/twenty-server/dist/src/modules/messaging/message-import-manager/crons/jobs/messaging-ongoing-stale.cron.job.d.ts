import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
export declare const MESSAGING_ONGOING_STALE_CRON_PATTERN = "0 * * * *";
export declare class MessagingOngoingStaleCronJob {
    private readonly messageChannelRepository;
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    constructor(messageChannelRepository: Repository<MessageChannelEntity>, messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
    private findStaleWorkspaceIds;
}
