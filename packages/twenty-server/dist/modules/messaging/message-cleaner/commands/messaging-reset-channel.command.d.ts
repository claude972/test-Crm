import { CommandRunner } from 'nest-commander';
import { Repository } from 'typeorm';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessageChannelSyncStatusService } from 'src/modules/messaging/common/services/message-channel-sync-status.service';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';
type MessagingResetChannelCommandOptions = {
    workspaceId: string;
    messageChannelId?: string;
};
export declare class MessagingResetChannelCommand extends CommandRunner {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messagingChannelSyncStatusService;
    private readonly messagingMessageCleanerService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messagingChannelSyncStatusService: MessageChannelSyncStatusService, messagingMessageCleanerService: MessagingMessageCleanerService);
    run(_passedParam: string[], options: MessagingResetChannelCommandOptions): Promise<void>;
    parseWorkspaceId(value: string): string;
    parseMessageChannelId(value: string): string;
}
export {};
