import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingDeleteFolderMessagesService } from 'src/modules/messaging/message-import-manager/services/messaging-delete-folder-messages.service';
import { MessagingImportFolderMessagesService } from 'src/modules/messaging/message-import-manager/services/messaging-import-folder-messages.service';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export type ProcessFolderActionsResult = {
    messageExternalIdsToImport: string[];
};
export declare class MessagingProcessFolderActionsService {
    private readonly workspaceOrmManager;
    private readonly messageFolderRepository;
    private readonly messagingDeleteFolderMessagesService;
    private readonly messagingImportFolderMessagesService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>, messagingDeleteFolderMessagesService: MessagingDeleteFolderMessagesService, messagingImportFolderMessagesService: MessagingImportFolderMessagesService);
    processFolderActions(messageChannel: MessageChannelEntity, messageFolders: MessageFolderEntity[], workspaceId: string): Promise<ProcessFolderActionsResult>;
}
