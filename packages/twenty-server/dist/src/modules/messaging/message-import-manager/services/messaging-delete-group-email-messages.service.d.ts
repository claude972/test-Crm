import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';
export declare class MessagingDeleteGroupEmailMessagesService {
    private readonly workspaceOrmManager;
    private readonly messagingMessageCleanerService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messagingMessageCleanerService: MessagingMessageCleanerService);
    deleteGroupEmailMessages(workspaceId: string, messageChannelId: string): Promise<number>;
}
