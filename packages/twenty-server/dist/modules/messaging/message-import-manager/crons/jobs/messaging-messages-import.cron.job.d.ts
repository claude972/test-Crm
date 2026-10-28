import { Repository } from 'typeorm';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
export declare const MESSAGING_MESSAGES_IMPORT_CRON_PATTERN = "*/1 * * * *";
export declare class MessagingMessagesImportCronJob {
    private readonly workspaceRepository;
    private readonly messageQueueService;
    private readonly exceptionHandlerService;
    private readonly messageChannelRepository;
    private readonly logger;
    constructor(workspaceRepository: Repository<WorkspaceEntity>, messageQueueService: MessageQueueService, exceptionHandlerService: ExceptionHandlerService, messageChannelRepository: Repository<MessageChannelEntity>);
    handle(): Promise<void>;
}
