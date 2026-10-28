import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import { GoogleOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/google/google-oauth2-client.provider';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type MessageFolderEntity } from 'src/engine/metadata-modules/message-folder/entities/message-folder.entity';
import { GmailGetHistoryService } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-get-history.service';
import { GmailMessageListFetchErrorHandler } from 'src/modules/messaging/message-import-manager/drivers/gmail/services/gmail-message-list-fetch-error-handler.service';
import { type GetMessageListsArgs } from 'src/modules/messaging/message-import-manager/types/get-message-lists-args.type';
import { type GetMessageListsResponse } from 'src/modules/messaging/message-import-manager/types/get-message-lists-response.type';
export declare class GmailGetMessageListService {
    private readonly gmailGetHistoryService;
    private readonly googleOAuth2ClientProvider;
    private readonly gmailMessageListFetchErrorHandler;
    private readonly logger;
    constructor(gmailGetHistoryService: GmailGetHistoryService, googleOAuth2ClientProvider: GoogleOAuth2ClientProvider, gmailMessageListFetchErrorHandler: GmailMessageListFetchErrorHandler);
    getMessageListWithoutCursor(connectedAccount: Pick<ConnectedAccountEntity, 'provider' | 'id' | 'handle'>, messageFolders: Pick<MessageFolderEntity, 'name' | 'externalId' | 'isSynced' | 'parentFolderId'>[], messageChannel: Pick<MessageChannelEntity, 'messageFolderImportPolicy'>): Promise<GetMessageListsResponse>;
    getMessageLists({ messageChannel, connectedAccount, messageFolders, }: GetMessageListsArgs): Promise<GetMessageListsResponse>;
}
