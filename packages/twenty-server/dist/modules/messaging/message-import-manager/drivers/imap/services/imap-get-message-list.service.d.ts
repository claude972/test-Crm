import { ImapClientProvider } from 'src/modules/messaging/message-import-manager/drivers/imap/providers/imap-client.provider';
import { ImapMessageListFetchErrorHandler } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-message-list-fetch-error-handler.service';
import { ImapSyncService } from 'src/modules/messaging/message-import-manager/drivers/imap/services/imap-sync.service';
import { type GetMessageListsArgs } from 'src/modules/messaging/message-import-manager/types/get-message-lists-args.type';
import { type GetMessageListsResponse } from 'src/modules/messaging/message-import-manager/types/get-message-lists-response.type';
export declare class ImapGetMessageListService {
    private readonly imapClientProvider;
    private readonly imapSyncService;
    private readonly errorHandler;
    private readonly logger;
    constructor(imapClientProvider: ImapClientProvider, imapSyncService: ImapSyncService, errorHandler: ImapMessageListFetchErrorHandler);
    getMessageLists({ connectedAccount, messageFolders, messageChannel, }: GetMessageListsArgs): Promise<GetMessageListsResponse>;
    private getMessageList;
    private canSkipFolderSync;
}
