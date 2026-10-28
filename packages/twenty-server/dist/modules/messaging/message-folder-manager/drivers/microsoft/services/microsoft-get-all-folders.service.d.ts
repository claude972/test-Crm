import { DiscoveredMessageFolder, MessageFolderDriver } from 'src/modules/messaging/message-folder-manager/interfaces/message-folder-driver.interface';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { MicrosoftOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MicrosoftMessageListFetchErrorHandler } from 'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-message-list-fetch-error-handler.service';
export declare class MicrosoftGetAllFoldersService implements MessageFolderDriver {
    private readonly microsoftOAuth2ClientProvider;
    private readonly microsoftMessageListFetchErrorHandler;
    private readonly logger;
    constructor(microsoftOAuth2ClientProvider: MicrosoftOAuth2ClientProvider, microsoftMessageListFetchErrorHandler: MicrosoftMessageListFetchErrorHandler);
    getAllMessageFolders(connectedAccount: Pick<ConnectedAccountEntity, 'id' | 'handle' | 'provider'>, messageChannel: Pick<MessageChannelEntity, 'messageFolderImportPolicy'>): Promise<DiscoveredMessageFolder[]>;
    private isSentFolder;
    private getRootFolderId;
    private getParentFolderId;
}
