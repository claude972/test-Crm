import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageChannelSyncStatusService } from 'src/modules/messaging/common/services/message-channel-sync-status.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
export declare const MESSAGING_MESSAGE_LIST_FETCH_CRON_PATTERN = "2-59/5 * * * *";
export declare class MessagingMessageListFetchCronJob {
    private readonly messageQueueService;
    private readonly messageChannelRepository;
    private readonly exceptionHandlerService;
    private readonly messageChannelSyncStatusService;
    private readonly logger;
    constructor(messageQueueService: MessageQueueService, messageChannelRepository: Repository<MessageChannelEntity>, exceptionHandlerService: ExceptionHandlerService, messageChannelSyncStatusService: MessageChannelSyncStatusService);
    handle(): Promise<void>;
}
