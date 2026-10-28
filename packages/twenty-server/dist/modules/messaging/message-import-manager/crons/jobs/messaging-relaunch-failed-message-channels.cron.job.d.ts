import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
export declare const MESSAGING_RELAUNCH_FAILED_MESSAGE_CHANNELS_CRON_PATTERN = "*/30 * * * *";
export declare class MessagingRelaunchFailedMessageChannelsCronJob {
    private readonly workspaceRepository;
    private readonly messageChannelRepository;
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    constructor(workspaceRepository: Repository<WorkspaceEntity>, messageChannelRepository: Repository<MessageChannelEntity>, messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService);
    handle(): Promise<void>;
}
