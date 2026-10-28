import { DiscoveredMessageFolder, MessageFolder } from 'src/modules/messaging/message-folder-manager/interfaces/message-folder-driver.interface';
import { type MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { WorkspaceOrmManager } from 'src/engine/kovaa-lab-orm/workspace-orm.manager';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { GmailGetAllFoldersService } from 'src/modules/messaging/message-folder-manager/drivers/gmail/services/gmail-get-all-folders.service';
import { ImapGetAllFoldersService } from 'src/modules/messaging/message-folder-manager/drivers/imap/services/imap-get-all-folders.service';
import { MicrosoftGetAllFoldersService } from 'src/modules/messaging/message-folder-manager/drivers/microsoft/services/microsoft-get-all-folders.service';
import { WorkspaceScopedRepository } from 'src/engine/kovaa-lab-orm/workspace-scoped-repository/workspace-scoped-repository';
export declare class SyncMessageFoldersService {
    private readonly workspaceOrmManager;
    private readonly messageFolderRepository;
    private readonly gmailGetAllFoldersService;
    private readonly microsoftGetAllFoldersService;
    private readonly imapGetAllFoldersService;
    constructor(workspaceOrmManager: WorkspaceOrmManager, messageFolderRepository: WorkspaceScopedRepository<MessageFolderEntity>, gmailGetAllFoldersService: GmailGetAllFoldersService, microsoftGetAllFoldersService: MicrosoftGetAllFoldersService, imapGetAllFoldersService: ImapGetAllFoldersService);
    syncMessageFolders({ messageChannel, workspaceId, }: {
        messageChannel: Pick<MessageChannelEntity, 'id' | 'messageFolderImportPolicy'> & {
            connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'accessToken' | 'refreshToken' | 'id' | 'handle' | 'connectionParameters' | 'workspaceId'>;
            messageFolders: MessageFolder[];
        };
        workspaceId: string;
    }): Promise<MessageFolder[]>;
    discoverAllFolders(connectedAccount: Pick<ConnectedAccountEntity, 'accessToken' | 'refreshToken' | 'id' | 'handle' | 'provider' | 'connectionParameters' | 'workspaceId'>, messageChannel: Pick<MessageChannelEntity, 'messageFolderImportPolicy'>, existingFolders: MessageFolder[]): Promise<DiscoveredMessageFolder[]>;
    private syncFolderChanges;
}
