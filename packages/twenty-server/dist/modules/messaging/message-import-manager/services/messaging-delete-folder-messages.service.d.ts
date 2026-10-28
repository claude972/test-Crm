import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { type MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { MessagingMessageCleanerService } from 'src/modules/messaging/message-cleaner/services/messaging-message-cleaner.service';
export declare class MessagingDeleteFolderMessagesService {
    private readonly messagingMessageCleanerService;
    private readonly workspaceOrmManager;
    private readonly logger;
    constructor(messagingMessageCleanerService: MessagingMessageCleanerService, workspaceOrmManager: WorkspaceOrmManager);
    deleteFolderMessages(workspaceId: string, messageChannel: MessageChannelEntity, messageFolder: MessageFolderEntity): Promise<number>;
}
