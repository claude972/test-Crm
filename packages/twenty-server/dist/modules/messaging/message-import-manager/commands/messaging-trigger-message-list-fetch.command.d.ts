import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
type MessagingTriggerMessageListFetchCommandOptions = {
    workspaceId: string;
    messageChannelId?: string;
};
export declare class MessagingTriggerMessageListFetchCommand extends CommandRunner {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageQueueService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageQueueService: MessageQueueService);
    run(_passedParam: string[], options: MessagingTriggerMessageListFetchCommandOptions): Promise<void>;
    parseWorkspaceId(value: string): string;
    parseMessageChannelId(value: string): string;
}
export {};
