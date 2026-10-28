import { DiscoveredMessageFolder, type MessageFolder, MessageFolderDriver } from 'src/modules/messaging/message-folder-manager/interfaces/message-folder-driver.interface';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';
import { ImapFindSentFolderService } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-find-sent-folder.service';
export declare class ImapGetAllFoldersService implements MessageFolderDriver {
    private readonly imapClientProvider;
    private readonly imapFindSentFolderService;
    private readonly logger;
    constructor(imapClientProvider: ImapClientProvider, imapFindSentFolderService: ImapFindSentFolderService);
    getAllMessageFolders(connectedAccount: Pick<ConnectedAccountEntity, 'id' | 'provider' | 'connectionParameters' | 'handle' | 'workspaceId'>, messageChannel: Pick<MessageChannelEntity, 'messageFolderImportPolicy'>, existingFolders: MessageFolder[]): Promise<DiscoveredMessageFolder[]>;
    private filterAndMapFolders;
    private isMailboxSelectable;
    private isValidMailbox;
    private getUidValidity;
}
