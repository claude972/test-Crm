import { MicrosoftOAuth2ClientProvider } from 'src/modules/connected-account/oauth2-client-manager/drivers/microsoft/microsoft-oauth2-client.provider';
import { MicrosoftMessageListFetchErrorHandler } from 'src/modules/messaging/message-import-manager/drivers/microsoft/services/microsoft-message-list-fetch-error-handler.service';
import { type GetMessageListsArgs } from 'src/modules/messaging/message-import-manager/types/get-message-lists-args.type';
import { type GetMessageListsResponse } from 'src/modules/messaging/message-import-manager/types/get-message-lists-response.type';
export declare class MicrosoftGetMessageListService {
    private readonly microsoftOAuth2ClientProvider;
    private readonly microsoftMessageListFetchErrorHandler;
    private readonly logger;
    constructor(microsoftOAuth2ClientProvider: MicrosoftOAuth2ClientProvider, microsoftMessageListFetchErrorHandler: MicrosoftMessageListFetchErrorHandler);
    getMessageLists({ messageChannel, connectedAccount, messageFolders, }: GetMessageListsArgs): Promise<GetMessageListsResponse>;
    private getMessageListBatch;
    private buildInitialDeltaUrl;
    private iterateFolderPages;
}
