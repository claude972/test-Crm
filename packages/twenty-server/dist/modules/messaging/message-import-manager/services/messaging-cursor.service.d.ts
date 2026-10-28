import { Repository } from 'typeorm';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class MessagingCursorService {
    private readonly workspaceOrmManager;
    private readonly messageChannelRepository;
    private readonly messageFolderRepository;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageChannelRepository: Repository<MessageChannelEntity>, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>);
    updateCursor(messageChannel: MessageChannelEntity, nextSyncCursor: string, workspaceId: string, folderId?: string): Promise<void>;
}
