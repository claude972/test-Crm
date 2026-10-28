import { Repository } from 'typeorm';
import { MessageChannelPendingGroupEmailsAction } from 'kovaa-lab-shared/types';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessagingDeleteGroupEmailMessagesService } from 'src/modules/messaging/message-import-manager/services/messaging-delete-group-email-messages.service';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class MessagingProcessGroupEmailActionsService {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageFolderRepository;
    private readonly messagingDeleteGroupEmailMessagesService;
    private readonly logger;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>, messagingDeleteGroupEmailMessagesService: MessagingDeleteGroupEmailMessagesService);
    markMessageChannelAsPendingGroupEmailsAction(messageChannel: MessageChannelEntity, workspaceId: string, pendingGroupEmailsAction: MessageChannelPendingGroupEmailsAction): Promise<void>;
    processGroupEmailActions(messageChannel: MessageChannelEntity, workspaceId: string): Promise<void>;
    private handleGroupEmailsDeletion;
    private handleGroupEmailsImport;
    private resetCursors;
}
